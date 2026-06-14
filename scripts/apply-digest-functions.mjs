#!/usr/bin/env node
/**
 * Introspect live Postgres schema and apply digest_* RPCs one at a time.
 *
 *   export DATABASE_URL='postgresql://postgres:...@db....supabase.co:5432/postgres'
 *   node scripts/apply-digest-functions.mjs
 */
import pg from "pg";

const TABLES = ["requests", "employees", "administrative_actions"];

async function loadColumns(client) {
  const { rows } = await client.query(
    `
    select table_name, column_name, data_type
    from information_schema.columns
    where table_schema = 'public'
      and table_name = any($1::text[])
    order by table_name, ordinal_position
    `,
    [TABLES],
  );

  /** @type {Record<string, Set<string>>} */
  const byTable = {};
  for (const table of TABLES) byTable[table] = new Set();
  for (const row of rows) {
    byTable[row.table_name]?.add(row.column_name);
  }
  return { rows, byTable };
}

function has(set, col) {
  return set.has(col);
}

function buildDigestRecentRequests(cols) {
  const r = cols.requests;
  const e = cols.employees;
  if (!has(r, "id") || !has(r, "company_id") || !has(r, "employee_id")) {
    throw new Error("requests table missing required columns (id, company_id, employee_id)");
  }

  const parts = [
    "r.id",
    has(r, "request_type")
      ? "case r.request_type when 'Leave' then 'طلب إجازة' when 'Financial' then 'طلب مالي' else 'طلب عام' end"
      : "'طلب'",
    has(r, "details") ? "coalesce(r.details, '')" : "''",
  ];

  const subtitleExpr = has(r, "details")
    ? `${parts[1]} || ' — ' || left(coalesce(r.details, ''), 40)`
    : parts[1];

  const needsApprovalExpr = has(r, "status") && has(r, "routing_to")
    ? `(r.status = 'Pending' and (
          coalesce(public.get_my_role(), '') in ('owner', 'Executive', 'HR_Manager', 'HR_Assistant')
          or (coalesce(public.get_my_role(), '') = 'Direct_Manager'
              and coalesce(r.routing_to, '') in ('Direct_Manager', ''))
          or (coalesce(public.get_my_role(), '') in ('HR_Manager', 'HR_Assistant')
              and r.routing_to = 'HR_Manager')
        ))`
    : has(r, "status")
      ? `(r.status = 'Pending')`
      : "false";

  const joinEmployees =
    has(e, "full_name") && has(e, "id")
      ? "left join public.employees emp on emp.id = r.employee_id"
      : "";

  const titleExpr =
    has(e, "full_name") && joinEmployees
      ? "coalesce(emp.full_name, 'موظف')"
      : "'موظف'";

  const orderCol = has(r, "created_at") ? "r.created_at" : "r.id";

  return `
create or replace function public.digest_recent_requests()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      r.id,
      ${titleExpr} as title,
      ${subtitleExpr} as subtitle,
      ${has(r, "status") ? "r.status," : ""}
      ${has(r, "created_at") ? "r.created_at," : ""}
      ${needsApprovalExpr} as needs_approval
    from public.requests r
    ${joinEmployees}
    where r.company_id = public.get_my_company_id()
    order by ${orderCol} desc
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;
`;
}

function buildDigestRecentJoiners(cols) {
  const e = cols.employees;
  if (!has(e, "id") || !has(e, "company_id") || !has(e, "full_name")) {
    throw new Error("employees table missing required columns (id, company_id, full_name)");
  }

  const subtitleParts = [];
  if (has(e, "job_title_name")) subtitleParts.push("coalesce(e.job_title_name, '—')");
  if (has(e, "department")) subtitleParts.push("coalesce(e.department, '—')");
  const subtitleExpr =
    subtitleParts.length > 1
      ? `${subtitleParts[0]} || ' · ' || ${subtitleParts[1]}`
      : subtitleParts[0] ?? "'—'";

  const activeFilter = has(e, "employment_status")
    ? `and coalesce(trim(e.employment_status), '') not in ('منتهي الخدمة', 'موقوف')`
    : "";

  const orderExpr = has(e, "hire_date")
    ? "coalesce(e.hire_date, e.created_at::date) desc nulls last"
    : has(e, "created_at")
      ? "e.created_at desc"
      : "e.id desc";

  return `
create or replace function public.digest_recent_joiners()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      e.id,
      e.full_name as title,
      ${subtitleExpr} as subtitle
      ${has(e, "hire_date") ? ", e.hire_date" : ""}
      ${has(e, "created_at") ? ", e.created_at" : ""}
    from public.employees e
    where e.company_id = public.get_my_company_id()
      ${activeFilter}
    order by ${orderExpr}
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;
`;
}

function buildDigestRecentRenewals(cols) {
  const e = cols.employees;
  if (!has(e, "id") || !has(e, "company_id") || !has(e, "full_name")) {
    throw new Error("employees table missing required columns for renewals");
  }
  if (!has(e, "hire_date")) {
    throw new Error("employees.hire_date required for digest_recent_renewals");
  }

  const activeFilter = has(e, "employment_status")
    ? "and coalesce(trim(e.employment_status), '') not in ('منتهي الخدمة', 'موقوف')"
    : "";

  return `
create or replace function public.digest_recent_renewals()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
  into v_items
  from (
    select
      e.id,
      e.full_name as title,
      'تجديد العقد — '
        || renewal.renewal_date::text
        || ' (بعد '
        || (renewal.renewal_date - current_date)::int
        || ' يوم)' as subtitle,
      renewal.renewal_date,
      (renewal.renewal_date - current_date) as days_remaining
    from public.employees e
    cross join lateral (
      select (
        e.hire_date + (
          (
            extract(year from current_date)::int
            - extract(year from e.hire_date)::int
            + case
                when to_char(e.hire_date, 'MMDD') <= to_char(current_date, 'MMDD')
                then 1
                else 0
              end
          ) || ' years'
        )::interval
      )::date as renewal_date
    ) renewal
    where e.company_id = public.get_my_company_id()
      and e.hire_date is not null
      ${activeFilter}
      and renewal.renewal_date >= current_date
      and renewal.renewal_date <= current_date + interval '3 months'
    order by renewal.renewal_date asc
    limit 5
  ) x;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;
`;
}

function buildDigestRecentAdminActions(cols, hasAdminTable) {
  const e = cols.employees;

  if (hasAdminTable) {
    const a = cols.administrative_actions;
    if (!has(a, "id") || !has(a, "company_id") || !has(a, "employee_id")) {
      throw new Error("administrative_actions missing required columns");
    }

    const reasonCol = has(a, "reason") ? "a.reason" : "''";
    const actionCol = has(a, "action_type") ? "a.action_type" : "'إجراء'";
    const createdCol = has(a, "created_at") ? "a.created_at" : "now()";
    const joinEmp =
      has(e, "full_name") && has(e, "id")
        ? "left join public.employees emp on emp.id = a.employee_id"
        : "";
    const titleExpr =
      has(e, "full_name") && joinEmp
        ? "coalesce(emp.full_name, 'موظف')"
        : "'موظف'";

    const adminBody = `
  execute $sql$
    select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    from (
      select
        a.id,
        ${titleExpr} as title,
        coalesce(${actionCol}::text, 'إجراء') || ' — ' || left(coalesce(${reasonCol}::text, ''), 40) as subtitle,
        ${createdCol} as created_at
      from public.administrative_actions a
      ${joinEmp}
      where a.company_id = public.get_my_company_id()
      order by ${createdCol} desc
      limit 5
    ) x
  $sql$ into v_items;`;

    const fallback = buildEmployeeUpdatesFallback(cols);

    return `
create or replace function public.digest_recent_admin_actions()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  v_items := '[]'::jsonb;

  if to_regclass('public.administrative_actions') is not null then
    ${adminBody}
  end if;

  if jsonb_array_length(coalesce(v_items, '[]'::jsonb)) = 0 then
    ${fallback.trim()}
  end if;

  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;
`;
  }

  return `
create or replace function public.digest_recent_admin_actions()
returns jsonb
language plpgsql stable security invoker set search_path = public
as $$
declare v_items jsonb;
begin
  ${buildEmployeeUpdatesFallback(cols).trim()}
  return jsonb_build_object('items', coalesce(v_items, '[]'::jsonb));
end;
$$;
`;
}

function buildEmployeeUpdatesFallback(cols) {
  const e = cols.employees;
  if (!has(e, "updated_at") || !has(e, "created_at")) {
    return "v_items := '[]'::jsonb;";
  }

  const subtitle =
    has(e, "job_title_name") && has(e, "department")
      ? "'تحديث: ' || coalesce(e.job_title_name, '—') || ' · ' || coalesce(e.department, '—')"
      : has(e, "job_title_name")
        ? "'تحديث: ' || coalesce(e.job_title_name, '—')"
        : "'تحديث بيانات موظف'";

  return `
    select coalesce(jsonb_agg(row_to_json(x)::jsonb), '[]'::jsonb)
    into v_items
    from (
      select
        e.id,
        e.full_name as title,
        ${subtitle} as subtitle,
        e.updated_at as created_at
      from public.employees e
      where e.company_id = public.get_my_company_id()
        and e.updated_at >= now() - interval '30 days'
        and e.updated_at > e.created_at + interval '1 day'
      order by e.updated_at desc
      limit 5
    ) x;`;
}

const DIGEST_FUNCTIONS = [
  { name: "digest_recent_requests", build: buildDigestRecentRequests },
  { name: "digest_recent_joiners", build: buildDigestRecentJoiners },
  { name: "digest_recent_renewals", build: buildDigestRecentRenewals },
  {
    name: "digest_recent_admin_actions",
    build: (cols, hasAdmin) => buildDigestRecentAdminActions(cols, hasAdmin),
  },
];

async function listDigestProcs(client) {
  const { rows } = await client.query(`
    select proname from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public' and proname like 'digest_%'
    order by proname
  `);
  return rows.map((row) => row.proname);
}

async function main() {
  const dbUrl =
    process.env.DATABASE_URL?.trim() || process.env.SUPABASE_DB_URL?.trim();
  if (!dbUrl) {
    throw new Error("Set DATABASE_URL then re-run: node scripts/apply-digest-functions.mjs");
  }

  const client = new pg.Client({
    connectionString: dbUrl,
    ssl: dbUrl.includes("localhost") ? undefined : { rejectUnauthorized: false },
  });

  await client.connect();

  try {
    const { rows: columnRows, byTable } = await loadColumns(client);

    console.log("=== Live schema (information_schema.columns) ===");
    for (const row of columnRows) {
      console.log(`  ${row.table_name}.${row.column_name} (${row.data_type})`);
    }

    const hasAdminTable = TABLES.includes("administrative_actions")
      && byTable.administrative_actions.size > 0;

    if (!byTable.requests.size) {
      console.warn("WARN: public.requests not found — digest_recent_requests may fail.");
    }

    const cols = {
      requests: byTable.requests,
      employees: byTable.employees,
      administrative_actions: byTable.administrative_actions,
    };

    /** @type {{ name: string, ok: boolean, error?: string }[]} */
    const results = [];

    for (const fn of DIGEST_FUNCTIONS) {
      console.log(`\n--- Applying ${fn.name} ---`);
      try {
        const sql =
          fn.name === "digest_recent_admin_actions"
            ? fn.build(cols, hasAdminTable)
            : fn.build(cols);
        await client.query(sql);
        await client.query(
          `grant execute on function public.${fn.name}() to authenticated`,
        );
        const procs = await listDigestProcs(client);
        console.log(`OK ${fn.name}. Current digest_* procs: ${procs.join(", ")}`);
        results.push({ name: fn.name, ok: true });
      } catch (error) {
        const message = error instanceof Error ? error.message : String(error);
        console.error(`FAILED ${fn.name}: ${message}`);
        results.push({ name: fn.name, ok: false, error: message });
      }
    }

    await client.query(`notify pgrst, 'reload schema';`);

    const finalProcs = await listDigestProcs(client);
    console.log("\n=== Final digest_* functions ===");
    console.log(finalProcs.join(", ") || "(none)");

    const failed = results.filter((item) => !item.ok);
    if (failed.length) {
      console.error("\nFailures:");
      for (const item of failed) {
        console.error(`  ${item.name}: ${item.error}`);
      }
      process.exit(1);
    }

    if (finalProcs.length < 4) {
      throw new Error(`Expected 4 digest functions, found ${finalProcs.length}.`);
    }

    console.log("\nAll 4 digest functions applied. PostgREST schema reloaded.");
  } finally {
    await client.end();
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exit(1);
});
