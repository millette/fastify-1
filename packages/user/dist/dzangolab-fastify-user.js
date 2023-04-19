import "@dzangolab/fastify-mercurius";
import P from "fastify-plugin";
import S from "mercurius";
import D from "mercurius-auth";
import L from "@fastify/cors";
import C from "@fastify/formbody";
import v from "supertokens-node";
import { errorHandler as N, plugin as _, wrapResponse as $ } from "supertokens-node/framework/fastify";
import { verifySession as T } from "supertokens-node/recipe/session/framework/fastify";
import f from "supertokens-node/recipe/session";
import d, { getUserByThirdPartyInfo as A } from "supertokens-node/recipe/thirdpartyemailpassword";
import { DefaultSqlFactory as y, BaseService as E } from "@dzangolab/fastify-slonik";
import g from "supertokens-node/recipe/userroles";
import "@dzangolab/fastify-mailer";
import R from "validator";
import { z as b } from "zod";
const B = P(async (e) => {
  e.config.mercurius.enabled && e.register(D, {
    async applyPolicy(r, t, n, a) {
      if (!a.user) {
        const i = new S.ErrorWithProps("unauthorized");
        return i.statusCode = 200, i;
      }
      return !0;
    },
    authDirective: "auth"
  });
}), M = () => ({}), q = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.session ? f.init(s.session(e)) : f.init(M());
};
let K = class extends y {
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
    return this._factory || (this._factory = new K(this)), this._factory;
  }
}
const H = (e, s) => {
  const { config: r, log: t, slonik: n } = s;
  return async (a) => {
    const i = await e.emailPasswordSignIn(
      a
    );
    if (i.status !== "OK")
      return i;
    const c = new h(r, n);
    let o;
    if (o = await c.findById(i.user.id), !o && (o = await c.create({
      id: i.user.id,
      email: i.user.email
    }), !o))
      throw t.error(`Unable to create user ${i.user.id}`), new Error(`Unable to create user ${i.user.id}`);
    return {
      status: "OK",
      user: {
        ...i.user,
        ...o
      }
    };
  };
}, O = async ({
  fastify: e,
  subject: s,
  templateData: r = {},
  templateName: t,
  to: n
}) => {
  const { config: a, mailer: i, log: c } = e;
  return i.sendMail({
    subject: s,
    templateName: t,
    to: n,
    templateData: {
      appName: a.appName,
      ...r
    }
  }).catch((o) => {
    throw c.error(o.stack), {
      name: "SEND_EMAIL",
      message: o.message,
      statusCode: 500
    };
  });
}, W = (e, s) => {
  const { config: r, log: t, slonik: n } = s;
  return async (a) => {
    if (r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const i = await e.emailPasswordSignUp(
      a
    );
    if (i.status === "OK") {
      const o = await new h(r, n).create({
        id: i.user.id,
        email: i.user.email
      });
      if (!o)
        throw t.error(`Unable to create user ${i.user.id}`), new Error(`Unable to create user ${i.user.id}`);
      i.user = {
        ...i.user,
        ...o
      };
      const u = await g.addRoleToUser(
        i.user.id,
        r.user.role || "USER"
      );
      u.status !== "OK" && t.error(u.status);
    }
    if (r.user.supertokens.sendUserAlreadyExistsWarning && i.status === "EMAIL_ALREADY_EXISTS_ERROR")
      try {
        await O({
          fastify: s,
          subject: "Duplicate Email Registration",
          templateData: {
            emailId: a.email
          },
          templateName: "duplicate-email-warning",
          to: a.email
        });
      } catch (c) {
        t.error(c);
      }
    return i;
  };
}, J = (e, s) => b.string({
  required_error: e.required
}).refine((r) => R.isEmail(r, s || {}), {
  message: e.invalid
}), I = {
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
    ...I,
    ...s
  };
  return b.string({
    required_error: e.required
  }).refine(
    (t) => R.isStrongPassword(
      t,
      r
    ),
    {
      message: e.weak
    }
  );
}, G = (e, s) => {
  const r = J(
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
    const t = e.minLength;
    r.push(
      `minimum ${t} ${t > 1 ? "characters" : "character"}`
    );
  }
  if (e.minLowercase) {
    const t = e.minLowercase;
    r.push(
      `minimum ${t} ${t > 1 ? "lowercases" : "lowercase"}`
    );
  }
  if (e.minUppercase) {
    const t = e.minUppercase;
    r.push(
      `minimum ${t} ${t > 1 ? "uppercases" : "uppercase"}`
    );
  }
  if (e.minNumbers) {
    const t = e.minNumbers;
    r.push(`minimum ${t} ${t > 1 ? "numbers" : "number"}`);
  }
  if (e.minSymbols) {
    const t = e.minSymbols;
    r.push(`minimum ${t} ${t > 1 ? "symbols" : "symbol"}`);
  }
  if (r.length > 0) {
    s = "Password should contain ";
    const t = r.pop();
    r.length > 0 && (s += r.join(", ") + " and "), s += t;
  }
  return s;
}, k = (e, s) => {
  const r = s.user.password, t = j(
    {
      required: "Password is required",
      weak: V({ ...I, ...r })
    },
    r
  ).safeParse(e);
  return t.success ? { success: !0 } : {
    message: t.error.issues[0].message,
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
      const r = k(s, e);
      if (!r.success)
        return r.message;
    }
  }
], z = (e) => {
  let s = [];
  if (typeof e.user.supertokens?.recipes?.thirdPartyEmailPassword == "object") {
    const t = e.user.supertokens?.recipes?.thirdPartyEmailPassword.signUpFeature?.formFields;
    t && (s = [...t]);
  }
  const r = new Set(s.map((t) => t.id));
  for (const t of X(e))
    r.has(t.id) || s.push(t);
  return s;
}, x = (e) => {
  let s;
  try {
    if (s = new URL(e).origin, !s || s === "null")
      throw new Error("Origin is empty");
  } catch {
    s = "";
  }
  return s;
}, Q = (e, s) => {
  const r = s.config.appOrigin[0], t = "/reset-password";
  return async (n) => {
    const a = n.userContext._default.request.request, i = a.headers.referer || a.headers.origin || a.hostname, c = x(i) || r, o = n.passwordResetLink.replace(
      r + "/auth/reset-password",
      c + (s.config.user.supertokens.resetPasswordPath || t)
    );
    await O({
      fastify: s,
      subject: "Reset Password",
      templateName: "reset-password",
      to: n.user.email,
      templateData: {
        passwordResetLink: o
      }
    });
  };
}, Y = (e, s) => {
  const { config: r, log: t, slonik: n } = s;
  return async (a) => {
    if (!await A(
      a.thirdPartyId,
      a.thirdPartyUserId,
      a.userContext
    ) && r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const c = await e.thirdPartySignInUp(
      a
    );
    if (c.status === "OK" && c.createdNewUser) {
      const o = await g.addRoleToUser(
        c.user.id,
        r.user.role || "USER"
      );
      o.status !== "OK" && t.error(o.status);
    }
    return c;
  };
}, Z = (e, s) => {
  const { config: r, log: t, slonik: n } = s;
  return async (a) => {
    if (e.thirdPartySignInUpPOST === void 0)
      throw new Error("Should never come here");
    const i = await e.thirdPartySignInUpPOST(a);
    if (i.status === "OK") {
      const c = new h(r, n);
      let o;
      if (o = await c.findById(i.user.id), !o && (o = await c.create({
        id: i.user.id,
        email: i.user.email
      }), !o))
        throw t.error(`Unable to create user ${i.user.id}`), new Error(`Unable to create user ${i.user.id}`);
      return {
        status: "OK",
        createdNewUser: i.createdNewUser,
        user: {
          ...i.user,
          ...o
        },
        session: i.session,
        authCodeResponse: i.authCodeResponse
      };
    }
    return i;
  };
}, ee = (e) => {
  const { Apple: s, Facebook: r, Github: t, Google: n } = d, a = e.user.supertokens.providers, i = [], c = [
    { name: "google", initProvider: n },
    { name: "github", initProvider: t },
    { name: "facebook", initProvider: r },
    { name: "apple", initProvider: s }
  ];
  for (const o of c)
    a?.[o.name] && i.push(
      o.initProvider(a[o.name])
    );
  return i;
}, se = (e) => {
  const { config: s } = e;
  let r = {};
  return typeof s.user.supertokens.recipes?.thirdPartyEmailPassword == "object" && (r = s.user.supertokens.recipes.thirdPartyEmailPassword), {
    override: {
      apis: (t) => {
        const n = {};
        if (r.override?.apis) {
          const a = r.override.apis;
          let i;
          for (i in a) {
            const c = a[i];
            c && (n[i] = c(
              t,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            ));
          }
        }
        return {
          ...t,
          // [DU 2023-APR-19] We do not need this
          // emailPasswordSignUpPOST: emailPasswordSignUpPOST(
          //   originalImplementation,
          //   fastify
          // ),
          thirdPartySignInUpPOST: Z(
            t,
            e
          ),
          ...n
        };
      },
      functions: (t) => {
        const n = {};
        if (r.override?.functions) {
          const a = r.override.functions;
          let i;
          for (i in a) {
            const c = a[i];
            c && (n[i] = c(
              t,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            ));
          }
        }
        return {
          ...t,
          emailPasswordSignIn: H(
            t,
            e
          ),
          emailPasswordSignUp: W(
            t,
            e
          ),
          thirdPartySignInUp: Y(
            t,
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
      override: (t) => {
        let n;
        return r?.sendEmail && (n = r.sendEmail), {
          ...t,
          sendEmail: n ? n(t, e) : Q(t, e)
        };
      }
    },
    providers: ee(s)
  };
}, re = (e) => {
  const s = e.config.user.supertokens.recipes?.thirdPartyEmailPassword;
  return typeof s == "function" ? d.init(s(e)) : d.init(
    se(e)
  );
}, te = () => ({}), ie = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.userRoles ? g.init(s.userRoles(e)) : g.init(te());
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
  const { config: t, log: n } = e;
  n.info("Registering supertokens plugin"), oe(e), e.setErrorHandler(N()), e.register(L, {
    origin: t.appOrigin,
    allowedHeaders: [
      "Content-Type",
      "st-auth-mode",
      ...v.getAllCORSHeaders()
    ],
    credentials: !0
  }), e.register(C), e.register(_), n.info("Registering supertokens plugin complete"), e.decorate("verifySession", T), r();
}, ce = P(ae), ue = async (e, s, r) => {
  const { config: t, slonik: n } = s, i = (await f.getSession(s, $(r), {
    sessionRequired: !1
  }))?.getUserId();
  if (i) {
    const c = new h(t, n), o = await d.getUserById(i);
    if (o) {
      let u = null;
      const { roles: p } = await g.getRolesForUser(i);
      try {
        u = await c.findById(i);
      } catch {
      }
      if (!u)
        throw new Error("Unable to find user profile");
      const m = {
        ...o,
        profile: u,
        roles: p
      };
      e.user = m;
    }
  }
}, de = P(
  async (e, s, r) => {
    const { mercurius: t } = e.config;
    await e.register(ce), t.enabled && await e.register(B), r();
  }
);
de.updateContext = ue;
class le extends y {
  /* eslint-enabled */
}
class l extends E {
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
  changePassword = async (s, r, t) => {
    const n = k(t, this.config);
    if (!n.success)
      return {
        status: "FIELD_ERROR",
        message: n.message
      };
    const a = await d.getUserById(s);
    if (r && t)
      if (a)
        if ((await d.emailPasswordSignIn(
          a.email,
          r
        )).status === "OK") {
          if (await d.updateEmailOrPassword({
            userId: s,
            password: t
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
    const t = new l(r.config, r.database);
    try {
      return r.user?.id ? await t.changePassword(
        r.user?.id,
        s.oldPassword,
        s.newPassword
      ) : {
        status: "NOT_FOUND",
        message: "User not found"
      };
    } catch (n) {
      r.app.log.error(n);
      const a = new S.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return a.statusCode = 500, a;
    }
  }
}, me = {
  me: async (e, s, r) => {
    const t = new l(r.config, r.database);
    if (r.user?.id)
      return t.findById(r.user.id);
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
  user: async (e, s, r) => await new l(r.config, r.database).findById(s.id),
  users: async (e, s, r) => await new l(r.config, r.database).list(
    s.limit,
    s.offset,
    s.filters ? JSON.parse(JSON.stringify(s.filters)) : void 0,
    s.sort ? JSON.parse(JSON.stringify(s.sort)) : void 0
  )
}, Le = { Mutation: pe, Query: me }, Ce = async (e, s, r) => {
  const t = "/change_password", n = "/me", a = "/users";
  e.get(
    a,
    {
      preHandler: e.verifySession()
    },
    async (i, c) => {
      const o = new l(i.config, i.slonik), { limit: u, offset: p, filters: m, sort: w } = i.query, U = await o.list(
        u,
        p,
        m ? JSON.parse(m) : void 0,
        w ? JSON.parse(w) : void 0
      );
      c.send(U);
    }
  ), e.post(
    t,
    {
      preHandler: e.verifySession()
    },
    async (i, c) => {
      try {
        const o = i.session, u = i.body, p = o && o.getUserId();
        if (!p)
          throw new Error("User not found in session");
        const m = u.oldPassword ?? "", w = u.newPassword ?? "", F = await new l(i.config, i.slonik).changePassword(
          p,
          m,
          w
        );
        c.send(F);
      } catch (o) {
        e.log.error(o), c.status(500), c.send({
          status: "ERROR",
          message: "Oops! Something went wrong",
          error: o
        });
      }
    }
  ), e.get(
    n,
    {
      preHandler: e.verifySession()
    },
    async (i, c) => {
      const o = new l(i.config, i.slonik), u = i.session?.getUserId();
      if (u)
        c.send(await o.findById(u));
      else
        throw e.log.error("Could not able to get user id from session"), new Error("Oops, Something went wrong");
    }
  ), r();
};
export {
  l as UserService,
  de as default,
  Le as userResolver,
  Ce as userRoutes
};
