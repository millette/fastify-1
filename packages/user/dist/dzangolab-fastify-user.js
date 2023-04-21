import "@dzangolab/fastify-mercurius";
import P from "fastify-plugin";
import S from "mercurius";
import F from "mercurius-auth";
import D from "@fastify/cors";
import L from "@fastify/formbody";
import v from "supertokens-node";
import { errorHandler as N, plugin as C, wrapResponse as $ } from "supertokens-node/framework/fastify";
import { verifySession as T } from "supertokens-node/recipe/session/framework/fastify";
import f from "supertokens-node/recipe/session";
import l, { getUserByThirdPartyInfo as A } from "supertokens-node/recipe/thirdpartyemailpassword";
import { DefaultSqlFactory as y, BaseService as E } from "@dzangolab/fastify-slonik";
import p from "supertokens-node/recipe/userroles";
import "@dzangolab/fastify-mailer";
import R from "validator";
import { z as b } from "zod";
const J = P(async (e) => {
  e.config.mercurius.enabled && e.register(F, {
    async applyPolicy(r, i, n, o) {
      if (!o.user) {
        const t = new S.ErrorWithProps("unauthorized");
        return t.statusCode = 200, t;
      }
      return !0;
    },
    authDirective: "auth"
  });
}), M = () => ({}), q = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.session ? f.init(s.session(e)) : f.init(M());
};
let B = class extends y {
  /* eslint-enabled */
};
class h extends E {
  /* eslint-enabled */
  static LIMIT_DEFAULT = 20;
  static LIMIT_MAX = 50;
  get table() {
    return this.config.user?.table?.name || "users";
  }
  get factory() {
    if (!this.table)
      throw new Error("Service table is not defined");
    return this._factory || (this._factory = new B(this)), this._factory;
  }
}
const K = (e, s) => {
  const { config: r, log: i, slonik: n } = s;
  return async (o) => {
    const t = await e.emailPasswordSignIn(
      o
    );
    if (t.status !== "OK")
      return t;
    const a = new h(r, n);
    let c;
    try {
      c = await a.update(t.user.id, {
        last_login_at: Date.now()
      });
    } catch {
      if (c = await a.create({
        id: t.user.id,
        email: t.user.email,
        signed_up_at: t.user.timeJoined,
        last_login_at: t.user.timeJoined
      }), !c)
        throw i.error(`Unable to create user ${t.user.id}`), new Error(`Unable to create user ${t.user.id}`);
    }
    return {
      status: "OK",
      user: {
        ...t.user,
        ...c
      }
    };
  };
}, O = async ({
  fastify: e,
  subject: s,
  templateData: r = {},
  templateName: i,
  to: n
}) => {
  const { config: o, mailer: t, log: a } = e;
  return t.sendMail({
    subject: s,
    templateName: i,
    to: n,
    templateData: {
      appName: o.appName,
      ...r
    }
  }).catch((c) => {
    throw a.error(c.stack), {
      name: "SEND_EMAIL",
      message: c.message,
      statusCode: 500
    };
  });
}, H = (e, s) => {
  const { config: r, log: i, slonik: n } = s;
  return async (o) => {
    if (r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const t = await e.emailPasswordSignUp(
      o
    );
    if (t.status === "OK") {
      const c = await new h(r, n).create({
        id: t.user.id,
        email: t.user.email,
        signed_up_at: t.user.timeJoined,
        last_login_at: t.user.timeJoined
      });
      if (!c)
        throw i.error(`Unable to create user ${t.user.id}`), new Error(`Unable to create user ${t.user.id}`);
      t.user = {
        ...t.user,
        ...c
      };
      const u = await p.addRoleToUser(
        t.user.id,
        r.user.role || "USER"
      );
      u.status !== "OK" && i.error(u.status);
    }
    if (r.user.supertokens.sendUserAlreadyExistsWarning && t.status === "EMAIL_ALREADY_EXISTS_ERROR")
      try {
        await O({
          fastify: s,
          subject: "Duplicate Email Registration",
          templateData: {
            emailId: o.email
          },
          templateName: "duplicate-email-warning",
          to: o.email
        });
      } catch (a) {
        i.error(a);
      }
    return t;
  };
}, W = (e, s) => b.string({
  required_error: e.required
}).refine((r) => R.isEmail(r, s || {}), {
  message: e.invalid
}), _ = {
  minLength: 8,
  minLowercase: 0,
  minUppercase: 0,
  minNumbers: 0,
  minSymbols: 0,
  returnScore: !1,
  pointsPerUnique: 1,
  pointsPerRepeat: 0.5,
  pointsForContainingLower: 10,
  pointsForContainingUpper: 10,
  pointsForContainingNumber: 10,
  pointsForContainingSymbol: 10
}, j = (e, s) => {
  const r = {
    ..._,
    ...s
  };
  return b.string({
    required_error: e.required
  }).refine(
    (i) => R.isStrongPassword(
      i,
      r
    ),
    {
      message: e.weak
    }
  );
}, G = (e, s) => {
  const r = W(
    {
      invalid: "Email is invalid",
      required: "Email is required"
    },
    s.user.email
  ).safeParse(e);
  return r.success ? { success: !0 } : {
    message: r.error.issues[0].message,
    success: !1
  };
}, V = (e) => {
  let s = "Password is too weak";
  if (!e)
    return s;
  const r = [];
  if (e.minLength) {
    const i = e.minLength;
    r.push(
      `minimum ${i} ${i > 1 ? "characters" : "character"}`
    );
  }
  if (e.minLowercase) {
    const i = e.minLowercase;
    r.push(
      `minimum ${i} ${i > 1 ? "lowercases" : "lowercase"}`
    );
  }
  if (e.minUppercase) {
    const i = e.minUppercase;
    r.push(
      `minimum ${i} ${i > 1 ? "uppercases" : "uppercase"}`
    );
  }
  if (e.minNumbers) {
    const i = e.minNumbers;
    r.push(`minimum ${i} ${i > 1 ? "numbers" : "number"}`);
  }
  if (e.minSymbols) {
    const i = e.minSymbols;
    r.push(`minimum ${i} ${i > 1 ? "symbols" : "symbol"}`);
  }
  if (r.length > 0) {
    s = "Password should contain ";
    const i = r.pop();
    r.length > 0 && (s += r.join(", ") + " and "), s += i;
  }
  return s;
}, I = (e, s) => {
  const r = s.user.password, i = j(
    {
      required: "Password is required",
      weak: V({ ..._, ...r })
    },
    r
  ).safeParse(e);
  return i.success ? { success: !0 } : {
    message: i.error.issues[0].message,
    success: !1
  };
}, X = (e) => [
  {
    id: "email",
    validate: async (s) => {
      const r = G(s, e);
      if (!r.success)
        return r.message;
    }
  },
  {
    id: "password",
    validate: async (s) => {
      const r = I(s, e);
      if (!r.success)
        return r.message;
    }
  }
], z = (e) => {
  let s = [];
  if (typeof e.user.supertokens?.recipes?.thirdPartyEmailPassword == "object") {
    const i = e.user.supertokens?.recipes?.thirdPartyEmailPassword.signUpFeature?.formFields;
    i && (s = [...i]);
  }
  const r = new Set(s.map((i) => i.id));
  for (const i of X(e))
    r.has(i.id) || s.push(i);
  return s;
}, Q = (e) => {
  let s;
  try {
    if (s = new URL(e).origin, !s || s === "null")
      throw new Error("Origin is empty");
  } catch {
    s = "";
  }
  return s;
}, Y = (e, s) => {
  const r = s.config.appOrigin[0], i = "/reset-password";
  return async (n) => {
    const o = n.userContext._default.request.request, t = o.headers.referer || o.headers.origin || o.hostname, a = Q(t) || r, c = n.passwordResetLink.replace(
      r + "/auth/reset-password",
      a + (s.config.user.supertokens.resetPasswordPath || i)
    );
    await O({
      fastify: s,
      subject: "Reset Password",
      templateName: "reset-password",
      to: n.user.email,
      templateData: {
        passwordResetLink: c
      }
    });
  };
}, x = (e, s) => {
  const { config: r, log: i } = s;
  return async (n) => {
    if (!await A(
      n.thirdPartyId,
      n.thirdPartyUserId,
      n.userContext
    ) && r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const t = await e.thirdPartySignInUp(
      n
    );
    if (t.status === "OK" && t.createdNewUser) {
      const a = await p.addRoleToUser(
        t.user.id,
        r.user.role || "USER"
      );
      a.status !== "OK" && i.error(a.status);
    }
    return t;
  };
}, Z = (e, s) => {
  const { config: r, log: i, slonik: n } = s;
  return async (o) => {
    if (e.thirdPartySignInUpPOST === void 0)
      throw new Error("Should never come here");
    const t = await e.thirdPartySignInUpPOST(o);
    if (t.status === "OK") {
      const a = new h(r, n);
      let c;
      try {
        c = await (t.createdNewUser ? a.create({
          id: t.user.id,
          email: t.user.email,
          signed_up_at: t.user.timeJoined,
          last_login_at: t.user.timeJoined
        }) : a.update(t.user.id, {
          last_login_at: Date.now()
        }));
      } catch {
        if (!c)
          throw i.error(`Unable to create user ${t.user.id}`), new Error(`Unable to create user ${t.user.id}`);
      }
      return {
        status: "OK",
        createdNewUser: t.createdNewUser,
        user: {
          ...t.user,
          ...c
        },
        session: t.session,
        authCodeResponse: t.authCodeResponse
      };
    }
    return t;
  };
}, ee = (e) => {
  const { Apple: s, Facebook: r, Github: i, Google: n } = l, o = e.user.supertokens.providers, t = [], a = [
    { name: "google", initProvider: n },
    { name: "github", initProvider: i },
    { name: "facebook", initProvider: r },
    { name: "apple", initProvider: s }
  ];
  for (const c of a)
    o?.[c.name] && t.push(
      c.initProvider(o[c.name])
    );
  return t;
}, se = (e) => {
  const { config: s } = e;
  let r = {};
  return typeof s.user.supertokens.recipes?.thirdPartyEmailPassword == "object" && (r = s.user.supertokens.recipes.thirdPartyEmailPassword), {
    override: {
      apis: (i) => {
        const n = {};
        if (r.override?.apis) {
          const o = r.override.apis;
          let t;
          for (t in o) {
            const a = o[t];
            a && (n[t] = a(
              i,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            ));
          }
        }
        return {
          ...i,
          // [DU 2023-APR-19] We do not need this
          // emailPasswordSignUpPOST: emailPasswordSignUpPOST(
          //   originalImplementation,
          //   fastify
          // ),
          thirdPartySignInUpPOST: Z(
            i,
            e
          ),
          ...n
        };
      },
      functions: (i) => {
        const n = {};
        if (r.override?.functions) {
          const o = r.override.functions;
          let t;
          for (t in o) {
            const a = o[t];
            a && (n[t] = a(
              i,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            ));
          }
        }
        return {
          ...i,
          emailPasswordSignIn: K(
            i,
            e
          ),
          emailPasswordSignUp: H(
            i,
            e
          ),
          thirdPartySignInUp: x(
            i,
            e
          ),
          ...n
        };
      }
    },
    signUpFeature: {
      formFields: z(s)
    },
    emailDelivery: {
      override: (i) => {
        let n;
        return r?.sendEmail && (n = r.sendEmail), {
          ...i,
          sendEmail: n ? n(i, e) : Y(i, e)
        };
      }
    },
    providers: ee(s)
  };
}, re = (e) => {
  const s = e.config.user.supertokens.recipes?.thirdPartyEmailPassword;
  return typeof s == "function" ? l.init(s(e)) : l.init(
    se(e)
  );
}, te = () => ({}), ie = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.userRoles ? p.init(s.userRoles(e)) : p.init(te());
}, ne = (e) => [
  q(e),
  re(e),
  ie(e)
], oe = (e) => {
  const { config: s } = e;
  v.init({
    appInfo: {
      apiDomain: s.baseUrl,
      appName: s.appName,
      websiteDomain: s.appOrigin[0]
    },
    recipeList: ne(e),
    supertokens: {
      connectionURI: s.user.supertokens.connectionUri
    }
  });
}, ae = async (e, s, r) => {
  const { config: i, log: n } = e;
  n.info("Registering supertokens plugin"), oe(e), e.setErrorHandler(N()), e.register(D, {
    origin: i.appOrigin,
    allowedHeaders: [
      "Content-Type",
      "st-auth-mode",
      ...v.getAllCORSHeaders()
    ],
    credentials: !0
  }), e.register(L), e.register(C), n.info("Registering supertokens plugin complete"), e.decorate("verifySession", T), r();
}, ce = P(ae), ue = async (e, s, r) => {
  const { config: i, slonik: n } = s, t = (await f.getSession(s, $(r), {
    sessionRequired: !1
  }))?.getUserId();
  if (t) {
    const a = new h(i, n);
    let c = null;
    try {
      c = await a.findById(t);
    } catch {
    }
    if (!c)
      throw new Error("Unable to find user");
    const { roles: u } = await p.getRolesForUser(t);
    e.user = c, e.roles = u;
  }
}, de = P(
  async (e, s, r) => {
    const { mercurius: i } = e.config;
    await e.register(ce), i.enabled && await e.register(J), r();
  }
);
de.updateContext = ue;
class le extends y {
  /* eslint-enabled */
}
class d extends E {
  constructor(s, r) {
    super(s, r);
  }
  /* eslint-enabled */
  static LIMIT_DEFAULT = 20;
  static LIMIT_MAX = 50;
  get table() {
    return this.config.user?.table?.name || "users";
  }
  get factory() {
    if (!this.table)
      throw new Error("Service table is not defined");
    return this._factory || (this._factory = new le(this)), this._factory;
  }
  changePassword = async (s, r, i) => {
    const n = I(i, this.config);
    if (!n.success)
      return {
        status: "FIELD_ERROR",
        message: n.message
      };
    const o = await l.getUserById(s);
    if (r && i)
      if (o)
        if ((await l.emailPasswordSignIn(
          o.email,
          r
        )).status === "OK") {
          if (await l.updateEmailOrPassword({
            userId: s,
            password: i
          }))
            return await f.revokeAllSessionsForUser(s), {
              status: "OK"
            };
          throw {
            status: "FAILED",
            message: "Oops! Something went wrong, couldn't change password"
          };
        } else
          return {
            status: "INVALID_PASSWORD",
            message: "Invalid password"
          };
      else
        throw {
          status: "NOT_FOUND",
          message: "User not found"
        };
    else
      return {
        status: "FIELD_ERROR",
        message: "Password cannot be empty"
      };
  };
}
const pe = {
  changePassword: async (e, s, r) => {
    const i = new d(r.config, r.database);
    try {
      return r.user?.id ? await i.changePassword(
        r.user?.id,
        s.oldPassword,
        s.newPassword
      ) : {
        status: "NOT_FOUND",
        message: "User not found"
      };
    } catch (n) {
      r.app.log.error(n);
      const o = new S.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return o.statusCode = 500, o;
    }
  }
}, me = {
  me: async (e, s, r) => {
    const i = new d(r.config, r.database);
    if (r.user?.id)
      return i.findById(r.user.id);
    {
      r.app.log.error(
        "Could not able to get user id from mercurius context"
      );
      const n = new S.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return n.statusCode = 500, n;
    }
  },
  user: async (e, s, r) => await new d(r.config, r.database).findById(s.id),
  users: async (e, s, r) => await new d(r.config, r.database).list(
    s.limit,
    s.offset,
    s.filters ? JSON.parse(JSON.stringify(s.filters)) : void 0,
    s.sort ? JSON.parse(JSON.stringify(s.sort)) : void 0
  )
}, De = { Mutation: pe, Query: me }, Le = async (e, s, r) => {
  const i = "/change_password", n = "/me", o = "/users";
  e.get(
    o,
    {
      preHandler: e.verifySession()
    },
    async (t, a) => {
      const c = new d(t.config, t.slonik), { limit: u, offset: m, filters: g, sort: w } = t.query, U = await c.list(
        u,
        m,
        g ? JSON.parse(g) : void 0,
        w ? JSON.parse(w) : void 0
      );
      a.send(U);
    }
  ), e.post(
    i,
    {
      preHandler: e.verifySession()
    },
    async (t, a) => {
      try {
        const c = t.session, u = t.body, m = c && c.getUserId();
        if (!m)
          throw new Error("User not found in session");
        const g = u.oldPassword ?? "", w = u.newPassword ?? "", k = await new d(t.config, t.slonik).changePassword(
          m,
          g,
          w
        );
        a.send(k);
      } catch (c) {
        e.log.error(c), a.status(500), a.send({
          status: "ERROR",
          message: "Oops! Something went wrong",
          error: c
        });
      }
    }
  ), e.get(
    n,
    {
      preHandler: e.verifySession()
    },
    async (t, a) => {
      const c = new d(t.config, t.slonik), u = t.session?.getUserId();
      if (u)
        a.send(await c.findById(u));
      else
        throw e.log.error("Could not able to get user id from session"), new Error("Oops, Something went wrong");
    }
  ), r();
};
export {
  d as UserService,
  de as default,
  De as userResolver,
  Le as userRoutes
};
