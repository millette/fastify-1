import "@dzangolab/fastify-mercurius";
import h from "fastify-plugin";
import P from "mercurius";
import b from "mercurius-auth";
import I from "@fastify/cors";
import k from "@fastify/formbody";
import S from "supertokens-node";
import { errorHandler as N, plugin as C, wrapResponse as D } from "supertokens-node/framework/fastify";
import { verifySession as T } from "supertokens-node/recipe/session/framework/fastify";
import w from "supertokens-node/recipe/session";
import d, { getUserByThirdPartyInfo as L } from "supertokens-node/recipe/thirdpartyemailpassword";
import l from "supertokens-node/recipe/userroles";
import { DefaultSqlFactory as F, BaseService as _ } from "@dzangolab/fastify-slonik";
import "@dzangolab/fastify-mailer";
import y from "validator";
import { z as U } from "zod";
const $ = h(async (e) => {
  e.config.mercurius.enabled && e.register(b, {
    async applyPolicy(t, r, n, o) {
      if (!o.user) {
        const i = new P.ErrorWithProps("unauthorized");
        return i.statusCode = 200, i;
      }
      return !0;
    },
    authDirective: "auth"
  });
}), A = () => ({
  override: {
    functions: function(e) {
      return {
        ...e,
        createNewSession: async function(s) {
          return s.accessTokenPayload = {
            ...s.accessTokenPayload,
            user: await d.getUserById(s.userId)
          }, e.createNewSession(s);
        }
      };
    }
  }
}), B = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.session ? w.init(s.session(e)) : w.init(A());
};
class K extends F {
  /* eslint-enabled */
}
class g extends _ {
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
const q = (e, s) => {
  const { config: t, slonik: r } = s;
  return async (n) => {
    const o = await e.emailPasswordSignIn(
      n
    );
    if (o.status !== "OK")
      return o;
    const i = new g(t, r);
    let a = null;
    try {
      a = await i.findById(o.user.id);
    } catch {
    }
    const { roles: c } = await l.getRolesForUser(o.user.id);
    return {
      status: "OK",
      user: {
        ...o.user,
        profile: a,
        roles: c
      }
    };
  };
}, v = async ({
  fastify: e,
  subject: s,
  templateData: t = {},
  templateName: r,
  to: n
}) => {
  const { config: o, mailer: i, log: a } = e;
  return i.sendMail({
    subject: s,
    templateName: r,
    to: n,
    templateData: {
      appName: o.appName,
      ...t
    }
  }).catch((c) => {
    throw a.error(c.stack), {
      name: "SEND_EMAIL",
      message: c.message,
      statusCode: 500
    };
  });
}, M = (e, s) => {
  const { config: t, log: r } = s;
  return async (n) => {
    if (t.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const o = await e.emailPasswordSignUp(
      n
    );
    if (o.status === "OK") {
      const i = await l.addRoleToUser(
        o.user.id,
        t.user.role || "USER"
      );
      i.status !== "OK" && r.error(i.status);
    }
    if (t.user.supertokens.sendUserAlreadyExistsWarning && o.status === "EMAIL_ALREADY_EXISTS_ERROR")
      try {
        await v({
          fastify: s,
          subject: "Duplicate Email Registration",
          templateData: {
            emailId: n.email
          },
          templateName: "duplicate-email-warning",
          to: n.email
        });
      } catch (i) {
        r.error(i);
      }
    return o;
  };
}, H = (e, s) => async (t) => {
  if (e.emailPasswordSignUpPOST === void 0)
    throw new Error("Should never come here");
  const r = await e.emailPasswordSignUpPOST(t);
  if (r.status === "OK") {
    const { roles: n } = await l.getRolesForUser(
      r.user.id
    );
    return {
      status: "OK",
      user: {
        ...r.user,
        /* eslint-disable-next-line unicorn/no-null */
        profile: null,
        roles: n
      },
      session: r.session
    };
  }
  return r;
}, J = (e) => {
  let s;
  try {
    if (s = new URL(e).origin, !s || s === "null")
      throw new Error("Origin is empty");
  } catch {
    s = "";
  }
  return s;
}, W = (e, s) => {
  const t = s.config.appOrigin[0], r = "/reset-password";
  return async (n) => {
    const o = n.userContext._default.request.request, i = o.headers.referer || o.headers.origin || o.hostname, a = J(i) || t, c = n.passwordResetLink.replace(
      t + "/auth/reset-password",
      a + (s.config.user.supertokens.resetPasswordPath || r)
    );
    await v({
      fastify: s,
      subject: "Reset Password",
      templateName: "reset-password",
      to: n.user.email,
      templateData: {
        passwordResetLink: c
      }
    });
  };
}, j = (e, s) => {
  const { config: t, log: r } = s;
  return async (n) => {
    if (!await L(
      n.thirdPartyId,
      n.thirdPartyUserId,
      n.userContext
    ) && t.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const i = await e.thirdPartySignInUp(
      n
    );
    if (i.status === "OK") {
      const a = await l.addRoleToUser(
        i.user.id,
        t.user.role || "USER"
      );
      a.status !== "OK" && r.error(a.status);
    }
    return i;
  };
}, G = (e, s) => async (t) => {
  if (e.thirdPartySignInUpPOST === void 0)
    throw new Error("Should never come here");
  const r = await e.thirdPartySignInUpPOST(t);
  if (r.status === "OK" && r.createdNewUser) {
    const { roles: n } = await l.getRolesForUser(
      r.user.id
    ), o = {
      ...r.user,
      /* eslint-disable-next-line unicorn/no-null */
      profile: null,
      roles: n
    };
    return {
      status: "OK",
      createdNewUser: r.createdNewUser,
      user: o,
      session: r.session,
      authCodeResponse: r.authCodeResponse
    };
  }
  return r;
}, V = (e) => {
  const { Apple: s, Facebook: t, Github: r, Google: n } = d, o = e.user.supertokens.providers, i = [], a = [
    { name: "google", initProvider: n },
    { name: "github", initProvider: r },
    { name: "facebook", initProvider: t },
    { name: "apple", initProvider: s }
  ];
  for (const c of a)
    o?.[c.name] && i.push(
      c.initProvider(o[c.name])
    );
  return i;
}, Q = (e, s) => U.string({
  required_error: e.required
}).refine((t) => y.isEmail(t, s || {}), {
  message: e.invalid
}), R = {
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
}, z = (e, s) => {
  const t = {
    ...R,
    ...s
  };
  return U.string({
    required_error: e.required
  }).refine(
    (r) => y.isStrongPassword(
      r,
      t
    ),
    {
      message: e.weak
    }
  );
}, X = (e, s) => {
  const t = Q(
    {
      invalid: "Email is invalid",
      required: "Email is required"
    },
    s.user.email
  ).safeParse(e);
  return t.success ? { success: !0 } : {
    message: t.error.issues[0].message,
    success: !1
  };
}, Y = (e) => {
  let s = "Password is too weak";
  if (!e)
    return s;
  const t = [];
  if (e.minLength) {
    const r = e.minLength;
    t.push(
      `minimum ${r} ${r > 1 ? "characters" : "character"}`
    );
  }
  if (e.minLowercase) {
    const r = e.minLowercase;
    t.push(
      `minimum ${r} ${r > 1 ? "lowercases" : "lowercase"}`
    );
  }
  if (e.minUppercase) {
    const r = e.minUppercase;
    t.push(
      `minimum ${r} ${r > 1 ? "uppercases" : "uppercase"}`
    );
  }
  if (e.minNumbers) {
    const r = e.minNumbers;
    t.push(`minimum ${r} ${r > 1 ? "numbers" : "number"}`);
  }
  if (e.minSymbols) {
    const r = e.minSymbols;
    t.push(`minimum ${r} ${r > 1 ? "symbols" : "symbol"}`);
  }
  if (t.length > 0) {
    s = "Password should contain ";
    const r = t.pop();
    t.length > 0 && (s += t.join(", ") + " and "), s += r;
  }
  return s;
}, E = (e, s) => {
  const t = s.user.password, r = z(
    {
      required: "Password is required",
      weak: Y({ ...R, ...t })
    },
    t
  ).safeParse(e);
  return r.success ? { success: !0 } : {
    message: r.error.issues[0].message,
    success: !1
  };
}, Z = (e) => {
  const { config: s } = e, t = s.user.supertokens.recipes?.thirdPartyEmailPassword;
  return {
    override: {
      apis: (r) => {
        const n = {};
        if (typeof t == "object" && t.override?.apis) {
          const o = t.override.apis;
          let i;
          for (i in o) {
            const a = o[i];
            a && (n[i] = a(
              r,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            ));
          }
        }
        return {
          ...r,
          emailPasswordSignUpPOST: H(
            r
          ),
          thirdPartySignInUpPOST: G(
            r
          ),
          ...n
        };
      },
      functions: (r) => {
        const n = {};
        if (typeof t == "object" && t.override?.function) {
          const o = t.override.function;
          let i;
          for (i in o) {
            const a = o[i];
            a && (n[i] = a(
              r,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            ));
          }
        }
        return {
          ...r,
          emailPasswordSignIn: q(
            r,
            e
          ),
          emailPasswordSignUp: M(
            r,
            e
          ),
          thirdPartySignInUp: j(
            r,
            e
          ),
          ...n
        };
      }
    },
    signUpFeature: {
      formFields: [
        {
          id: "email",
          validate: async (r) => {
            const n = X(r, s);
            if (!n.success)
              return n.message;
          }
        },
        {
          id: "password",
          validate: async (r) => {
            const n = E(r, s);
            if (!n.success)
              return n.message;
          }
        }
      ]
    },
    emailDelivery: {
      override: (r) => {
        let n;
        return typeof t == "object" && typeof t?.sendEmail == "function" && (n = t.sendEmail), {
          ...r,
          sendEmail: n ? n(r, e) : W(r, e)
        };
      }
    },
    providers: V(s)
  };
}, x = (e) => {
  const s = e.config.user.supertokens.recipes?.thirdPartyEmailPassword;
  return typeof s == "function" ? d.init(s(e)) : d.init(
    Z(e)
  );
}, ee = () => ({}), se = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.userRoles ? l.init(s.userRoles(e)) : l.init(ee());
}, re = (e) => [
  B(e),
  x(e),
  se(e)
], te = (e) => {
  const { config: s } = e;
  S.init({
    appInfo: {
      apiDomain: s.baseUrl,
      appName: s.appName,
      websiteDomain: s.appOrigin[0]
    },
    recipeList: re(e),
    supertokens: {
      connectionURI: s.user.supertokens.connectionUri
    }
  });
}, ne = async (e, s, t) => {
  const { config: r, log: n } = e;
  n.info("Registering supertokens plugin"), te(e), e.setErrorHandler(N()), e.register(I, {
    origin: r.appOrigin,
    allowedHeaders: [
      "Content-Type",
      "st-auth-mode",
      ...S.getAllCORSHeaders()
    ],
    credentials: !0
  }), e.register(k), e.register(C), n.info("Registering supertokens plugin complete"), e.decorate("verifySession", T), t();
}, oe = h(ne), ie = async (e, s, t) => {
  const { config: r, slonik: n } = s, i = (await w.getSession(s, D(t), {
    sessionRequired: !1
  }))?.getUserId();
  if (i) {
    const a = new g(r, n), c = await d.getUserById(i);
    if (c) {
      let u = null;
      const { roles: p } = await l.getRolesForUser(i);
      try {
        u = await a.findById(i);
      } catch {
      }
      const m = {
        ...c,
        profile: u,
        roles: p
      };
      e.user = m;
    }
  }
}, ae = h(
  async (e, s, t) => {
    const { mercurius: r } = e.config;
    await e.register(oe), r.enabled && await e.register($), t();
  }
);
ae.updateContext = ie;
const ce = {
  user: async (e, s, t) => await new g(t.config, t.database).findById(s.id),
  users: async (e, s, t) => await new g(t.config, t.database).list(
    s.limit,
    s.offset,
    s.filters ? JSON.parse(JSON.stringify(s.filters)) : void 0,
    s.sort ? JSON.parse(JSON.stringify(s.sort)) : void 0
  )
}, ke = { Query: ce }, Ne = async (e, s, t) => {
  const r = "/users";
  e.get(
    r,
    {
      preHandler: e.verifySession()
    },
    async (n, o) => {
      const i = new g(n.config, n.slonik), { limit: a, offset: c, filters: u, sort: p } = n.query, m = await i.list(
        a,
        c,
        u ? JSON.parse(u) : void 0,
        p ? JSON.parse(p) : void 0
      );
      o.send(m);
    }
  ), t();
};
class f {
  config;
  database;
  constructor(s, t) {
    this.config = s, this.database = t;
  }
  changePassword = async (s, t, r) => {
    const n = E(r, this.config);
    if (!n.success)
      return {
        status: "FIELD_ERROR",
        message: n.message
      };
    const o = await d.getUserById(s);
    if (t && r)
      if (o)
        if ((await d.emailPasswordSignIn(
          o.email,
          t
        )).status === "OK") {
          if (await d.updateEmailOrPassword({
            userId: s,
            password: r
          }))
            return await w.revokeAllSessionsForUser(s), {
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
  getUserById = async (s) => {
    const t = await d.getUserById(s), r = new g(this.config, this.database);
    let n = null;
    try {
      n = await r.findById(s);
    } catch {
    }
    const o = await l.getRolesForUser(s);
    return {
      email: t?.email,
      id: s,
      profile: n,
      roles: o.roles,
      timeJoined: t?.timeJoined
    };
  };
}
const ue = {
  changePassword: async (e, s, t) => {
    const r = new f(t.config, t.database);
    try {
      return t.user?.id ? await r.changePassword(
        t.user?.id,
        s.oldPassword,
        s.newPassword
      ) : {
        status: "NOT_FOUND",
        message: "User not found"
      };
    } catch (n) {
      t.app.log.error(n);
      const o = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return o.statusCode = 500, o;
    }
  }
}, de = {
  me: async (e, s, t) => {
    const r = new f(t.config, t.database);
    if (t.user?.id)
      return r.getUserById(t.user.id);
    {
      t.app.log.error("Cound not get user id from mercurius context");
      const n = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return n.statusCode = 500, n;
    }
  }
}, Ce = { Mutation: ue, Query: de }, De = async (e, s, t) => {
  const r = "/change_password", n = "/me";
  e.post(
    r,
    {
      preHandler: e.verifySession()
    },
    async (o, i) => {
      try {
        const a = o.session, c = o.body, u = a && a.getUserId();
        if (!u)
          throw new Error("User not found in session");
        const p = c.oldPassword ?? "", m = c.newPassword ?? "", O = await new f(o.config, o.slonik).changePassword(
          u,
          p,
          m
        );
        i.send(O);
      } catch (a) {
        e.log.error(a), i.status(500), i.send({
          status: "ERROR",
          message: "Oops! Something went wrong",
          error: a
        });
      }
    }
  ), e.get(
    n,
    {
      preHandler: e.verifySession()
    },
    async (o, i) => {
      const a = new f(o.config, o.slonik), c = o.session?.getUserId();
      if (c)
        i.send(await a.getUserById(c));
      else
        throw e.log.error("Cound not get user id from session"), new Error("Oops, Something went wrong");
    }
  ), t();
};
export {
  g as UserProfileService,
  f as UserService,
  ae as default,
  ke as userProfileResolver,
  Ne as userProfileRoutes,
  Ce as userResolver,
  De as userRoutes
};
