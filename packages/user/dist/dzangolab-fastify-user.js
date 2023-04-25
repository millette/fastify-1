import "@dzangolab/fastify-mercurius";
import f from "fastify-plugin";
import P from "mercurius";
import k from "mercurius-auth";
import D from "@fastify/cors";
import F from "@fastify/formbody";
import U from "supertokens-node";
import { errorHandler as N, plugin as C, wrapResponse as L } from "supertokens-node/framework/fastify";
import { verifySession as $ } from "supertokens-node/recipe/session/framework/fastify";
import h from "supertokens-node/recipe/session";
import l, { getUserByThirdPartyInfo as T } from "supertokens-node/recipe/thirdpartyemailpassword";
import { DefaultSqlFactory as _, BaseService as A } from "@dzangolab/fastify-slonik";
import v from "validator";
import { z as E } from "zod";
import p from "supertokens-node/recipe/userroles";
import "@dzangolab/fastify-mailer";
const B = f(async (e) => {
  e.config.mercurius.enabled && e.register(k, {
    async applyPolicy(r, t, i, o) {
      if (!o.user) {
        const n = new P.ErrorWithProps("unauthorized");
        return n.statusCode = 200, n;
      }
      return !0;
    },
    authDirective: "auth"
  });
}), K = () => ({}), q = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.session ? h.init(s.session(e)) : h.init(K());
};
class M extends _ {
  /* eslint-enabled */
}
const H = (e, s) => E.string({
  required_error: e.required
}).refine((r) => v.isEmail(r, s || {}), {
  message: e.invalid
}), y = {
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
}, W = (e, s) => {
  const r = {
    ...y,
    ...s
  };
  return E.string({
    required_error: e.required
  }).refine(
    (t) => v.isStrongPassword(
      t,
      r
    ),
    {
      message: e.weak
    }
  );
}, J = (e) => {
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
}, R = (e, s) => {
  const r = s.user.password, t = W(
    {
      required: "Password is required",
      weak: J({ ...y, ...r })
    },
    r
  ).safeParse(e);
  return t.success ? { success: !0 } : {
    message: t.error.issues[0].message,
    success: !1
  };
};
class d extends A {
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
    return this._factory || (this._factory = new M(this)), this._factory;
  }
  changePassword = async (s, r, t) => {
    const i = R(t, this.config);
    if (!i.success)
      return {
        status: "FIELD_ERROR",
        message: i.message
      };
    const o = await l.getUserById(s);
    if (r && t)
      if (o)
        if ((await l.emailPasswordSignIn(
          o.email,
          r
        )).status === "OK") {
          if (await l.updateEmailOrPassword({
            userId: s,
            password: t
          }))
            return await h.revokeAllSessionsForUser(s), {
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
const O = (e) => e.toISOString().slice(0, 23).replace("T", " "), j = (e, s) => {
  const { config: r, log: t, slonik: i } = s;
  return async (o) => {
    const n = await e.emailPasswordSignIn(
      o
    );
    if (n.status !== "OK")
      return n;
    const a = new d(r, i);
    let c;
    try {
      c = await a.update(n.user.id, {
        lastLoginAt: O(/* @__PURE__ */ new Date())
      });
    } catch {
      if (!c)
        throw t.error(`Unable to update user ${n.user.id}`), new Error(`Unable to update user ${n.user.id}`);
    }
    return {
      status: "OK",
      user: {
        ...n.user,
        ...c
      }
    };
  };
}, b = async ({
  fastify: e,
  subject: s,
  templateData: r = {},
  templateName: t,
  to: i
}) => {
  const { config: o, mailer: n, log: a } = e;
  return n.sendMail({
    subject: s,
    templateName: t,
    to: i,
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
}, G = (e, s) => {
  const { config: r, log: t, slonik: i } = s;
  return async (o) => {
    if (r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const n = await e.emailPasswordSignUp(
      o
    );
    if (n.status === "OK") {
      const c = await new d(r, i).create({
        id: n.user.id,
        email: n.user.email
      });
      if (!c)
        throw t.error(`Unable to create user ${n.user.id}`), new Error(`Unable to create user ${n.user.id}`);
      n.user = {
        ...n.user,
        ...c
      };
      const u = await p.addRoleToUser(
        n.user.id,
        r.user.role || "USER"
      );
      u.status !== "OK" && t.error(u.status);
    }
    if (r.user.supertokens.sendUserAlreadyExistsWarning && n.status === "EMAIL_ALREADY_EXISTS_ERROR")
      try {
        await b({
          fastify: s,
          subject: "Duplicate Email Registration",
          templateData: {
            emailId: o.email
          },
          templateName: "duplicate-email-warning",
          to: o.email
        });
      } catch (a) {
        t.error(a);
      }
    return n;
  };
}, V = (e, s) => {
  const r = H(
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
}, z = (e) => [
  {
    id: "email",
    validate: async (s) => {
      const r = V(s, e);
      if (!r.success)
        return r.message;
    }
  },
  {
    id: "password",
    validate: async (s) => {
      const r = R(s, e);
      if (!r.success)
        return r.message;
    }
  }
], X = (e) => {
  let s = [];
  if (typeof e.user.supertokens?.recipes?.thirdPartyEmailPassword == "object") {
    const t = e.user.supertokens?.recipes?.thirdPartyEmailPassword.signUpFeature?.formFields;
    t && (s = [...t]);
  }
  const r = new Set(s.map((t) => t.id));
  for (const t of z(e))
    r.has(t.id) || s.push(t);
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
  const r = s.config.appOrigin[0], t = "/reset-password";
  return async (i) => {
    const o = i.userContext._default.request.request, n = o.headers.referer || o.headers.origin || o.hostname, a = Q(n) || r, c = i.passwordResetLink.replace(
      r + "/auth/reset-password",
      a + (s.config.user.supertokens.resetPasswordPath || t)
    );
    await b({
      fastify: s,
      subject: "Reset Password",
      templateName: "reset-password",
      to: i.user.email,
      templateData: {
        passwordResetLink: c
      }
    });
  };
}, Z = (e, s) => {
  const { config: r, log: t } = s;
  return async (i) => {
    if (!await T(
      i.thirdPartyId,
      i.thirdPartyUserId,
      i.userContext
    ) && r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const n = await e.thirdPartySignInUp(
      i
    );
    if (n.status === "OK" && n.createdNewUser) {
      const a = await p.addRoleToUser(
        n.user.id,
        r.user.role || "USER"
      );
      a.status !== "OK" && t.error(a.status);
    }
    return n;
  };
}, x = (e, s) => {
  const { config: r, log: t, slonik: i } = s;
  return async (o) => {
    if (e.thirdPartySignInUpPOST === void 0)
      throw new Error("Should never come here");
    const n = await e.thirdPartySignInUpPOST(o);
    if (n.status === "OK") {
      const a = new d(r, i);
      let c;
      try {
        c = await (n.createdNewUser ? a.create({
          id: n.user.id,
          email: n.user.email
        }) : a.update(n.user.id, {
          lastLoginAt: O(/* @__PURE__ */ new Date())
        }));
      } catch {
        if (!c)
          throw t.error(`Unable to create user ${n.user.id}`), new Error(`Unable to create user ${n.user.id}`);
      }
      return {
        status: "OK",
        createdNewUser: n.createdNewUser,
        user: {
          ...n.user,
          ...c
        },
        session: n.session,
        authCodeResponse: n.authCodeResponse
      };
    }
    return n;
  };
}, ee = (e) => {
  const { Apple: s, Facebook: r, Github: t, Google: i } = l, o = e.user.supertokens.providers, n = [], a = [
    { name: "google", initProvider: i },
    { name: "github", initProvider: t },
    { name: "facebook", initProvider: r },
    { name: "apple", initProvider: s }
  ];
  for (const c of a)
    o?.[c.name] && n.push(
      c.initProvider(o[c.name])
    );
  return n;
}, se = (e) => {
  const { config: s } = e;
  let r = {};
  return typeof s.user.supertokens.recipes?.thirdPartyEmailPassword == "object" && (r = s.user.supertokens.recipes.thirdPartyEmailPassword), {
    override: {
      apis: (t) => {
        const i = {};
        if (r.override?.apis) {
          const o = r.override.apis;
          let n;
          for (n in o) {
            const a = o[n];
            a && (i[n] = a(
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
          thirdPartySignInUpPOST: x(
            t,
            e
          ),
          ...i
        };
      },
      functions: (t) => {
        const i = {};
        if (r.override?.functions) {
          const o = r.override.functions;
          let n;
          for (n in o) {
            const a = o[n];
            a && (i[n] = a(
              t,
              e
              // eslint-disable-next-line  @typescript-eslint/no-explicit-any
            ));
          }
        }
        return {
          ...t,
          emailPasswordSignIn: j(
            t,
            e
          ),
          emailPasswordSignUp: G(
            t,
            e
          ),
          thirdPartySignInUp: Z(
            t,
            e
          ),
          ...i
        };
      }
    },
    signUpFeature: {
      formFields: X(s)
    },
    emailDelivery: {
      override: (t) => {
        let i;
        return r?.sendEmail && (i = r.sendEmail), {
          ...t,
          sendEmail: i ? i(t, e) : Y(t, e)
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
}, te = () => ({}), ne = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.userRoles ? p.init(s.userRoles(e)) : p.init(te());
}, ie = (e) => [
  q(e),
  re(e),
  ne(e)
], oe = (e) => {
  const { config: s } = e;
  U.init({
    appInfo: {
      apiDomain: s.baseUrl,
      appName: s.appName,
      websiteDomain: s.appOrigin[0]
    },
    recipeList: ie(e),
    supertokens: {
      connectionURI: s.user.supertokens.connectionUri
    }
  });
}, ae = async (e, s, r) => {
  const { config: t, log: i } = e;
  i.info("Registering supertokens plugin"), oe(e), e.setErrorHandler(N()), e.register(D, {
    origin: t.appOrigin,
    allowedHeaders: [
      "Content-Type",
      "st-auth-mode",
      ...U.getAllCORSHeaders()
    ],
    credentials: !0
  }), e.register(F), e.register(C), i.info("Registering supertokens plugin complete"), e.decorate("verifySession", $), r();
}, ce = f(ae), ue = async (e, s, r) => {
  const { config: t, slonik: i } = s, n = (await h.getSession(s, L(r), {
    sessionRequired: !1
  }))?.getUserId();
  if (n) {
    const a = new d(t, i);
    let c = null;
    try {
      c = await a.findById(n);
    } catch {
    }
    if (!c)
      throw new Error("Unable to find user");
    const { roles: u } = await p.getRolesForUser(n);
    e.user = c, e.roles = u;
  }
}, de = f(
  async (e, s, r) => {
    const { mercurius: t } = e.config;
    await e.register(ce), t.enabled && await e.register(B), r();
  }
);
de.updateContext = ue;
const le = {
  changePassword: async (e, s, r) => {
    const t = new d(r.config, r.database);
    try {
      return r.user?.id ? await t.changePassword(
        r.user?.id,
        s.oldPassword,
        s.newPassword
      ) : {
        status: "NOT_FOUND",
        message: "User not found"
      };
    } catch (i) {
      r.app.log.error(i);
      const o = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return o.statusCode = 500, o;
    }
  }
}, pe = {
  me: async (e, s, r) => {
    const t = new d(r.config, r.database);
    if (r.user?.id)
      return t.findById(r.user.id);
    {
      r.app.log.error(
        "Could not able to get user id from mercurius context"
      );
      const i = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return i.statusCode = 500, i;
    }
  },
  user: async (e, s, r) => await new d(r.config, r.database).findById(s.id),
  users: async (e, s, r) => await new d(r.config, r.database).list(
    s.limit,
    s.offset,
    s.filters ? JSON.parse(JSON.stringify(s.filters)) : void 0,
    s.sort ? JSON.parse(JSON.stringify(s.sort)) : void 0
  )
}, De = { Mutation: le, Query: pe }, Fe = async (e, s, r) => {
  const t = "/change_password", i = "/me", o = "/users";
  e.get(
    o,
    {
      preHandler: e.verifySession()
    },
    async (n, a) => {
      const c = new d(n.config, n.slonik), { limit: u, offset: m, filters: g, sort: w } = n.query, S = await c.list(
        u,
        m,
        g ? JSON.parse(g) : void 0,
        w ? JSON.parse(w) : void 0
      );
      a.send(S);
    }
  ), e.post(
    t,
    {
      preHandler: e.verifySession()
    },
    async (n, a) => {
      try {
        const c = n.session, u = n.body, m = c && c.getUserId();
        if (!m)
          throw new Error("User not found in session");
        const g = u.oldPassword ?? "", w = u.newPassword ?? "", I = await new d(n.config, n.slonik).changePassword(
          m,
          g,
          w
        );
        a.send(I);
      } catch (c) {
        e.log.error(c), a.status(500), a.send({
          status: "ERROR",
          message: "Oops! Something went wrong",
          error: c
        });
      }
    }
  ), e.get(
    i,
    {
      preHandler: e.verifySession()
    },
    async (n, a) => {
      const c = new d(n.config, n.slonik), u = n.session?.getUserId();
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
  Fe as userRoutes
};
