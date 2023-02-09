import "@dzangolab/fastify-mercurius";
import l from "fastify-plugin";
import { DefaultSqlFactory as u, BaseService as y } from "@dzangolab/fastify-slonik";
const d = (t, e, s) => {
  s();
}, m = l(d);
class p extends u {
  /* eslint-enabled */
}
class i extends y {
  /* eslint-enabled */
  static TABLE = "users";
  static LIMIT_DEFAULT = 20;
  static LIMIT_MAX = 50;
  constructor(e, s, r) {
    super(e, s, r);
  }
  get factory() {
    if (!this.table)
      throw new Error("Service table is not defined");
    return this._factory || (this._factory = new p(this)), this._factory;
  }
}
const v = {
  user: async (t, e, s) => await new i(s.config, s.database).findById(e.id),
  users: async (t, e, s) => await new i(s.config, s.database).list(e.limit, e.offset)
}, S = { Query: v }, I = async (t, e, s) => {
  t.get(
    "/users",
    {
      preHandler: t.verifySession()
    },
    async (r, o) => {
      const a = new i(r.config, r.slonik), { limit: n, offset: c } = r.query, f = await a.list(n, c);
      o.send(f);
    }
  ), s();
};
export {
  i as UserProfileService,
  m as default,
  S as userProfileResolver,
  I as userProfileRoutes
};
