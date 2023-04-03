import h from "fastify-plugin";
import { SchemaValidationError as S, createPool as E, sql as t, stringifyDsn as T } from "slonik";
import m from "humps";
import { migrate as q } from "@dzangolab/postgres-migrations";
import { z as g } from "zod";
const $ = {
  transformRow: (a, e, n, r) => m.camelizeKeys(n)
}, R = {
  // If you are not going to transform results using Zod, then you should use `afterQueryExecution` instead.
  // Future versions of Zod will provide a more efficient parser when parsing without transformations.
  // You can even combine the two – use `afterQueryExecution` to validate results, and (conditionally)
  // transform results as needed in `transformRow`.
  transformRow: (a, e, n, r) => {
    const { resultParser: s } = a;
    if (!s)
      return n;
    const i = s.safeParse(n);
    if (!i.success)
      throw new S(
        e,
        n,
        i.error.issues
      );
    return i.data;
  }
}, y = (a) => {
  const e = {
    captureStackTrace: !1,
    connectionRetryLimit: 3,
    connectionTimeout: 5e3,
    idleInTransactionSessionTimeout: 6e4,
    idleTimeout: 5e3,
    interceptors: [],
    maximumPoolSize: 10,
    queryRetryLimit: 5,
    statementTimeout: 6e4,
    transactionRetryLimit: 5,
    ...a
  };
  return e.interceptors = [
    $,
    R,
    ...a?.interceptors ?? []
  ], e;
}, v = async (a) => {
  const e = a.slonik, n = {
    database: e.db.databaseName,
    user: e.db.username,
    password: e.db.password,
    host: e.db.host,
    port: e.db.port,
    // Default: false for backwards-compatibility
    // This might change!
    ensureDatabaseExists: !0,
    // Default: "postgres"
    // Used when checking/creating "database-name"
    defaultDatabase: "postgres"
  }, r = "migrations";
  await q(
    n,
    e?.migrations?.path || r
  );
}, F = async (a, e) => {
  const n = await E(
    a,
    y(e)
  );
  return {
    connect: n.connect.bind(n),
    pool: n,
    query: n.query.bind(n)
  };
}, b = async (a, e) => {
  const { connectionString: n, clientConfiguration: r } = e;
  let s;
  try {
    s = await F(n, r), await s.pool.connect(async () => {
      a.log.info("✅ Connected to Postgres DB");
    });
  } catch (i) {
    throw a.log.error("🔴 Error happened while connecting to Postgres DB"), new Error(i);
  }
  !a.hasDecorator("slonik") && !a.hasDecorator("sql") && (a.decorate("slonik", s), a.decorate("sql", t)), !a.hasRequestDecorator("slonik") && !a.hasRequestDecorator("sql") && (a.decorateRequest("slonik", null), a.decorateRequest("sql", null), a.addHook("onRequest", async (i) => {
    i.slonik = s, i.sql = t;
  }));
}, w = h(b, {
  fastify: "4.x",
  name: "fastify-slonik"
});
h(b, {
  fastify: "4.x",
  name: "fastify-slonik"
});
const D = async (a, e, n) => {
  const r = a.config.slonik;
  a.log.info("Registering fastify-slonik plugin"), a.register(w, {
    connectionString: T(r.db),
    clientConfiguration: y(r?.clientConfiguration)
  }), a.log.info("Running database migrations"), await v(a.config), n();
}, P = h(D), L = (a, e) => {
  const n = a.key, r = a.operator || "eq", s = a.not || !1;
  let i = a.value;
  const c = t.identifier([...e.names, n]);
  let o;
  switch (r) {
    case "ct":
    case "sw":
    case "ew": {
      i = {
        ct: `%${i}%`,
        // contains
        ew: `%${i}`,
        // ends with
        sw: `${i}%`
        // starts with
      }[r], o = s ? t.fragment`NOT ILIKE` : t.fragment`ILIKE`;
      break;
    }
    case "eq":
    default: {
      o = s ? t.fragment`!=` : t.fragment`=`;
      break;
    }
    case "gt": {
      o = s ? t.fragment`<` : t.fragment`>`;
      break;
    }
    case "gte": {
      o = s ? t.fragment`<` : t.fragment`>=`;
      break;
    }
    case "lte": {
      o = s ? t.fragment`>` : t.fragment`<=`;
      break;
    }
    case "lt": {
      o = s ? t.fragment`>` : t.fragment`<`;
      break;
    }
    case "in": {
      o = s ? t.fragment`NOT IN` : t.fragment`IN`, i = t.fragment`(${t.join(i.split(","), t.fragment`, `)})`;
      break;
    }
    case "bt": {
      o = s ? t.fragment`NOT BETWEEN` : t.fragment`BETWEEN`, i = t.fragment`${t.join(i.split(","), t.fragment` AND `)}`;
      break;
    }
  }
  return t.fragment`${c} ${o} ${i}`;
}, k = (a, e, n = !1) => {
  const r = [], s = [];
  let i;
  const c = (o, u, p = !1) => {
    if (o.AND)
      for (const l of o.AND)
        c(l, u);
    else if (o.OR)
      for (const l of o.OR)
        c(l, u, !0);
    else {
      const l = L(o, u);
      p ? s.push(l) : r.push(l);
    }
  };
  return c(a, e, n), r.length > 0 && s.length > 0 ? i = t.join(
    [
      t.fragment`(${t.join(r, t.fragment` AND `)})`,
      t.fragment`(${t.join(s, t.fragment` OR `)})`
    ],
    t.fragment`${a.AND ? t.fragment` AND ` : t.fragment` OR `}`
  ) : r.length > 0 ? i = t.join(r, t.fragment` AND `) : s.length > 0 && (i = t.join(s, t.fragment` OR `)), i ? t.fragment`WHERE ${i}` : t.fragment``;
}, d = (a, e) => a ? k(a, e) : t.fragment``, C = (a, e) => {
  let n = t.fragment`LIMIT ${a}`;
  return e && (n = t.fragment`LIMIT ${a} OFFSET ${e}`), n;
}, I = (a, e) => {
  if (e && e.length > 0) {
    const n = [];
    for (const r of e) {
      const s = r.direction === "ASC" ? t.fragment`ASC` : t.fragment`DESC`;
      n.push(
        t.fragment`${t.identifier([
          ...a.names,
          r.key
        ])} ${s}`
      );
    }
    return t.fragment`ORDER BY ${t.join(n, t.fragment`,`)}`;
  }
  return t.fragment`ORDER BY id ASC`;
}, N = (a, e) => t.fragment`${f(a, e)}`, f = (a, e) => t.identifier(e ? [e, a] : [a]), U = (a) => t.fragment`WHERE id = ${a}`;
class O {
  /* eslint-enabled */
  _service;
  constructor(e) {
    this._service = e;
  }
  getAllSql = (e) => {
    const n = [], r = {};
    for (const i of e)
      n.push(t.identifier([m.decamelize(i)])), r[i] = !0;
    const s = this.validationSchema._def.typeName === "ZodObject" ? this.validationSchema.pick(r) : g.any();
    return t.type(s)`
      SELECT ${t.join(n, t.fragment`, `)}
      FROM ${this.getTableFragment()}
      ORDER BY id ASC;
    `;
  };
  getCreateSql = (e) => {
    const n = [], r = [];
    for (const s in e) {
      const i = s, c = e[i];
      n.push(t.identifier([m.decamelize(i)])), r.push(c);
    }
    return t.type(this.validationSchema)`
      INSERT INTO ${this.getTableFragment()}
        (${t.join(n, t.fragment`, `)})
      VALUES (${t.join(r, t.fragment`, `)})
      RETURNING *;
    `;
  };
  getDeleteSql = (e) => t.type(this.validationSchema)`
      DELETE FROM ${this.getTableFragment()}
      WHERE id = ${e}
      RETURNING *;
    `;
  getFindByIdSql = (e) => t.type(this.validationSchema)`
      SELECT *
      FROM ${this.getTableFragment()}
      WHERE id = ${e};
    `;
  getListSql = (e, n, r, s) => {
    const i = f(this.table, this.schema);
    return t.type(this.validationSchema)`
      SELECT *
      FROM ${this.getTableFragment()}
      ${d(r, i)}
      ${I(i, s)}
      ${C(e, n)};
    `;
  };
  getTableFragment = () => N(this.table, this.schema);
  getUpdateSql = (e, n) => {
    const r = [];
    for (const s in n) {
      const i = n[s];
      r.push(
        t.fragment`${t.identifier([m.decamelize(s)])} = ${i}`
      );
    }
    return t.type(this.validationSchema)`
      UPDATE ${this.getTableFragment()}
      SET ${t.join(r, t.fragment`, `)}
      WHERE id = ${e}
      RETURNING *;
    `;
  };
  getCountSql = (e) => {
    const n = f(this.table, this.schema), r = g.object({
      count: g.number()
    });
    return t.type(r)`
      SELECT COUNT(*)
      FROM ${this.getTableFragment()}
      ${d(e, n)};
    `;
  };
  get config() {
    return this.service.config;
  }
  get database() {
    return this.service.database;
  }
  get service() {
    return this._service;
  }
  get schema() {
    return this.service.schema;
  }
  get table() {
    return this.service.table;
  }
  get validationSchema() {
    return this.service.validationSchema;
  }
}
class x {
  /* eslint-enabled */
  static TABLE = void 0;
  static LIMIT_DEFAULT = 20;
  static LIMIT_MAX = 50;
  _config;
  _database;
  _factory;
  _schema = "public";
  _validationSchema = g.any();
  constructor(e, n, r) {
    this._config = e, this._database = n, r && (this._schema = r);
  }
  /**
   * Only for entities that support it. Returns the full list of entities,
   * with no filtering, no custom sorting order, no pagination,
   * but with a restricted set of data.
   * Example: to get the full list of countries to populate the CountryPicker
   */
  all = async (e) => {
    const n = this.factory.getAllSql(e);
    return await this.database.connect((s) => s.any(n));
  };
  create = async (e) => {
    const n = this.factory.getCreateSql(e), r = await this.database.connect(async (s) => s.query(n).then((i) => i.rows[0]));
    return r ? this.postCreate(r) : void 0;
  };
  delete = async (e) => {
    const n = this.factory.getDeleteSql(e);
    return await this.database.connect((s) => s.one(n));
  };
  findById = async (e) => {
    const n = this.factory.getFindByIdSql(e);
    return await this.database.connect((s) => s.maybeOne(n));
  };
  getLimitDefault = () => this.config.slonik?.pagination?.defaultLimit || this.constructor.LIMIT_DEFAULT;
  getLimitMax = () => this.config.slonik?.pagination?.maxLimit || this.constructor.LIMIT_MAX;
  list = async (e, n, r, s) => {
    const i = this.factory.getListSql(
      Math.min(e ?? this.getLimitDefault(), this.getLimitMax()),
      n,
      r,
      s
    );
    return await this.database.connect((o) => o.any(i));
  };
  paginatedList = async (e, n, r, s) => {
    const i = await this.list(e, n, r, s), c = await this.count(r), o = await this.count();
    return {
      filteredCount: c,
      totalCount: o,
      data: [...i]
    };
  };
  count = async (e) => {
    const n = this.factory.getCountSql(e);
    return (await this.database.connect((s) => s.any(n)))[0].count;
  };
  update = async (e, n) => {
    const r = this.factory.getUpdateSql(e, n);
    return await this.database.connect((s) => s.query(r).then((i) => i.rows[0]));
  };
  get config() {
    return this._config;
  }
  get database() {
    return this._database;
  }
  get factory() {
    if (!this.table)
      throw new Error("Service table is not defined");
    return this._factory || (this._factory = new O(this)), this.factory;
  }
  get schema() {
    return this._schema || "public";
  }
  get table() {
    return this.constructor.TABLE;
  }
  get validationSchema() {
    return this._validationSchema || g.any();
  }
  postCreate = async (e) => e;
}
export {
  x as BaseService,
  O as DefaultSqlFactory,
  F as createDatabase,
  d as createFilterFragment,
  C as createLimitFragment,
  I as createSortFragment,
  N as createTableFragment,
  f as createTableIdentifier,
  U as createWhereIdFragment,
  P as default
};
