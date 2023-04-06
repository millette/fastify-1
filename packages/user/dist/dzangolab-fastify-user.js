import "@dzangolab/fastify-mercurius";
import h from "fastify-plugin";
import P from "mercurius";
import I from "mercurius-auth";
import b from "@fastify/cors";
import k from "@fastify/formbody";
import S from "supertokens-node";
import { errorHandler as N, plugin as C, wrapResponse as D } from "supertokens-node/framework/fastify";
import { verifySession as T } from "supertokens-node/recipe/session/framework/fastify";
import w from "supertokens-node/recipe/session";
import d, { getUserByThirdPartyInfo as L } from "supertokens-node/recipe/thirdpartyemailpassword";
import l from "supertokens-node/recipe/userroles";
import { DefaultSqlFactory as F, BaseService as _ } from "@dzangolab/fastify-slonik";
import "@dzangolab/fastify-mailer";
import U from "validator";
import { z as y } from "zod";
const $ = h(async (e) => {
  e.config.mercurius.enabled && e.register(I, {
    async applyPolicy(r, t, n, o) {
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
class p extends _ {
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
  const { config: r, slonik: t } = s;
  return async (n) => {
    const o = await e.emailPasswordSignIn(
      n
    );
    if (o.status !== "OK")
      return o;
    const i = new p(r, t);
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
  templateData: r = {},
  templateName: t,
  to: n
}) => {
  const { config: o, mailer: i, log: a } = e;
  return i.sendMail({
    subject: s,
    templateName: t,
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
}, M = (e, s) => {
  const { config: r, log: t } = s;
  return async (n) => {
    if (r.user.features?.signUp === !1)
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
        r.user.role || "USER"
      );
      i.status !== "OK" && t.error(i.status);
    }
    if (r.user.supertokens.sendUserAlreadyExistsWarning && o.status === "EMAIL_ALREADY_EXISTS_ERROR")
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
        t.error(i);
      }
    return o;
  };
}, H = (e, s) => async (r) => {
  if (e.emailPasswordSignUpPOST === void 0)
    throw new Error("Should never come here");
  const t = await e.emailPasswordSignUpPOST(r);
  if (t.status === "OK") {
    const { roles: n } = await l.getRolesForUser(
      t.user.id
    );
    return {
      status: "OK",
      user: {
        ...t.user,
        /* eslint-disable-next-line unicorn/no-null */
        profile: null,
        roles: n
      },
      session: t.session
    };
  }
  return t;
}, J = (e) => {
  let s;
  try {
    if (s = new URL(e).origin, !s || s === "null")
      throw new Error("Origin is empty");
  } catch {
    s = "";
  }
  return s;
}, W = (e) => {
  const s = e.config.appOrigin[0], r = "/reset-password";
  return async (t) => {
    const n = t.userContext._default.request.request, o = n.headers.referer || n.headers.origin || n.hostname, i = J(o) || s, a = t.passwordResetLink.replace(
      s + "/auth/reset-password",
      i + (e.config.user.supertokens.resetPasswordPath || r)
    );
    await v({
      fastify: e,
      subject: "Reset Password",
      templateName: "reset-password",
      to: t.user.email,
      templateData: {
        passwordResetLink: a
      }
    });
  };
}, G = (e, s) => {
  const { config: r, log: t } = s;
  return async (n) => {
    if (!await L(
      n.thirdPartyId,
      n.thirdPartyUserId,
      n.userContext
    ) && r.user.features?.signUp === !1)
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
        r.user.role || "USER"
      );
      a.status !== "OK" && t.error(a.status);
    }
    return i;
  };
}, j = (e, s) => async (r) => {
  if (e.thirdPartySignInUpPOST === void 0)
    throw new Error("Should never come here");
  const t = await e.thirdPartySignInUpPOST(r);
  if (t.status === "OK" && t.createdNewUser) {
    const { roles: n } = await l.getRolesForUser(
      t.user.id
    ), o = {
      ...t.user,
      /* eslint-disable-next-line unicorn/no-null */
      profile: null,
      roles: n
    };
    return {
      status: "OK",
      createdNewUser: t.createdNewUser,
      user: o,
      session: t.session,
      authCodeResponse: t.authCodeResponse
    };
  }
  return t;
}, V = (e) => {
  const { Apple: s, Facebook: r, Github: t, Google: n } = d, o = e.user.supertokens.providers, i = [], a = [
    { name: "google", initProvider: n },
    { name: "github", initProvider: t },
    { name: "facebook", initProvider: r },
    { name: "apple", initProvider: s }
  ];
  for (const c of a)
    o?.[c.name] && i.push(
      c.initProvider(o[c.name])
    );
  return i;
}, Q = (e, s) => y.string({
  required_error: e.required
}).refine((r) => U.isEmail(r, s || {}), {
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
  const r = {
    ...R,
    ...s
  };
  return y.string({
    required_error: e.required
  }).refine(
    (t) => U.isStrongPassword(
      t,
      r
    ),
    {
      message: e.weak
    }
  );
}, X = (e, s) => {
  const r = Q(
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
}, Y = (e) => {
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
}, O = (e, s) => {
  const r = s.user.password, t = z(
    {
      required: "Password is required",
      weak: Y({ ...R, ...r })
    },
    r
  ).safeParse(e);
  return t.success ? { success: !0 } : {
    message: t.error.issues[0].message,
    success: !1
  };
}, Z = (e) => {
  const { config: s } = e;
  return {
    override: {
      apis: (r) => {
        const t = s.user.supertokens.recipes?.thirdPartyEmailPassword;
        let n;
        typeof t == "object" && (n = t?.override?.apis);
        const o = {};
        if (n) {
          let i;
          for (i in n) {
            const a = n[i];
            a && a(
              r,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            );
          }
        }
        return {
          ...r,
          emailPasswordSignUpPOST: H(
            r
          ),
          thirdPartySignInUpPOST: j(
            r
          ),
          ...o
        };
      },
      functions: (r) => ({
        ...r,
        emailPasswordSignIn: q(
          r,
          e
        ),
        emailPasswordSignUp: M(
          r,
          e
        ),
        thirdPartySignInUp: G(
          r,
          e
        )
      })
    },
    signUpFeature: {
      formFields: [
        {
          id: "email",
          validate: async (r) => {
            const t = X(r, s);
            if (!t.success)
              return t.message;
          }
        },
        {
          id: "password",
          validate: async (r) => {
            const t = O(r, s);
            if (!t.success)
              return t.message;
          }
        }
      ]
    },
    emailDelivery: {
      override: (r) => ({
        ...r,
        sendEmail: W(e)
      })
    },
    providers: V(s)
  };
}, x = (e) => {
  const s = e.config.user.supertokens.recipes?.thirdPartyEmailPassword;
  return s && typeof s == "function" ? d.init(s(e)) : d.init(
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
}, ne = async (e, s, r) => {
  const { config: t, log: n } = e;
  n.info("Registering supertokens plugin"), te(e), e.setErrorHandler(N()), e.register(b, {
    origin: t.appOrigin,
    allowedHeaders: [
      "Content-Type",
      "st-auth-mode",
      ...S.getAllCORSHeaders()
    ],
    credentials: !0
  }), e.register(k), e.register(C), n.info("Registering supertokens plugin complete"), e.decorate("verifySession", T), r();
}, oe = h(ne), ie = async (e, s, r) => {
  const { config: t, slonik: n } = s, i = (await w.getSession(s, D(r), {
    sessionRequired: !1
  }))?.getUserId();
  if (i) {
    const a = new p(t, n), c = await d.getUserById(i);
    if (c) {
      let u = null;
      const { roles: g } = await l.getRolesForUser(i);
      try {
        u = await a.findById(i);
      } catch {
      }
      const m = {
        ...c,
        profile: u,
        roles: g
      };
      e.user = m;
    }
  }
}, ae = h(
  async (e, s, r) => {
    const { mercurius: t } = e.config;
    await e.register(oe), t.enabled && await e.register($), r();
  }
);
ae.updateContext = ie;
const ce = {
  user: async (e, s, r) => await new p(r.config, r.database).findById(s.id),
  users: async (e, s, r) => await new p(r.config, r.database).list(
    s.limit,
    s.offset,
    s.filters ? JSON.parse(JSON.stringify(s.filters)) : void 0,
    s.sort ? JSON.parse(JSON.stringify(s.sort)) : void 0
  )
}, ke = { Query: ce }, Ne = async (e, s, r) => {
  const t = "/users";
  e.get(
    t,
    {
      preHandler: e.verifySession()
    },
    async (n, o) => {
      const i = new p(n.config, n.slonik), { limit: a, offset: c, filters: u, sort: g } = n.query, m = await i.list(
        a,
        c,
        u ? JSON.parse(u) : void 0,
        g ? JSON.parse(g) : void 0
      );
      o.send(m);
    }
  ), r();
};
class f {
  config;
  database;
  constructor(s, r) {
    this.config = s, this.database = r;
  }
  changePassword = async (s, r, t) => {
    const n = O(t, this.config);
    if (!n.success)
      return {
        status: "FIELD_ERROR",
        message: n.message
      };
    const o = await d.getUserById(s);
    if (r && t)
      if (o)
        if ((await d.emailPasswordSignIn(
          o.email,
          r
        )).status === "OK") {
          if (await d.updateEmailOrPassword({
            userId: s,
            password: t
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
    const r = await d.getUserById(s), t = new p(this.config, this.database);
    let n = null;
    try {
      n = await t.findById(s);
    } catch {
    }
    const o = await l.getRolesForUser(s);
    return {
      email: r?.email,
      id: s,
      profile: n,
      roles: o.roles,
      timeJoined: r?.timeJoined
    };
  };
}
const ue = {
  changePassword: async (e, s, r) => {
    const t = new f(r.config, r.database);
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
      const o = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return o.statusCode = 500, o;
    }
  }
}, de = {
  me: async (e, s, r) => {
    const t = new f(r.config, r.database);
    if (r.user?.id)
      return t.getUserById(r.user.id);
    {
      r.app.log.error("Cound not get user id from mercurius context");
      const n = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return n.statusCode = 500, n;
    }
  }
}, Ce = { Mutation: ue, Query: de }, De = async (e, s, r) => {
  const t = "/change_password", n = "/me";
  e.post(
    t,
    {
      preHandler: e.verifySession()
    },
    async (o, i) => {
      try {
        const a = o.session, c = o.body, u = a && a.getUserId();
        if (!u)
          throw new Error("User not found in session");
        const g = c.oldPassword ?? "", m = c.newPassword ?? "", E = await new f(o.config, o.slonik).changePassword(
          u,
          g,
          m
        );
        i.send(E);
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
  ), r();
};
export {
  p as UserProfileService,
  f as UserService,
  ae as default,
  ke as userProfileResolver,
  Ne as userProfileRoutes,
  Ce as userResolver,
  De as userRoutes
};
