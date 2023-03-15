import "@dzangolab/fastify-mercurius";
import h from "fastify-plugin";
import P from "mercurius";
import v from "mercurius-auth";
import y from "@fastify/cors";
import E from "@fastify/formbody";
import S from "supertokens-node";
import { errorHandler as O, plugin as I, wrapResponse as D } from "supertokens-node/framework/fastify";
import { verifySession as b } from "supertokens-node/recipe/session/framework/fastify";
import m from "supertokens-node/recipe/session";
import d, { getUserByThirdPartyInfo as k } from "supertokens-node/recipe/thirdpartyemailpassword";
import l from "supertokens-node/recipe/userroles";
import { DefaultSqlFactory as N, BaseService as T } from "@dzangolab/fastify-slonik";
import "@dzangolab/fastify-mailer";
const C = h(async (e) => {
  e.config.mercurius.enabled && e.register(v, {
    async applyPolicy(r, o, n, t) {
      if (!t.user) {
        const i = new P.ErrorWithProps("unauthorized");
        return i.statusCode = 200, i;
      }
      return !0;
    },
    authDirective: "auth"
  });
}), L = () => ({
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
}), F = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.session ? m.init(s.session(e)) : m.init(L());
};
class _ extends N {
  /* eslint-enabled */
}
class g extends T {
  /* eslint-enabled */
  static LIMIT_DEFAULT = 20;
  static LIMIT_MAX = 50;
  get table() {
    return this.config.user?.table?.name || "users";
  }
  get factory() {
    if (!this.table)
      throw new Error("Service table is not defined");
    return this._factory || (this._factory = new _(this)), this._factory;
  }
}
const A = (e, s) => {
  const { config: r, slonik: o } = s;
  return async (n) => {
    const t = await e.emailPasswordSignIn(
      n
    );
    if (t.status !== "OK")
      return t;
    const i = new g(r, o);
    let a = null;
    try {
      a = await i.findById(t.user.id);
    } catch {
    }
    const { roles: c } = await l.getRolesForUser(t.user.id);
    return {
      status: "OK",
      user: {
        ...t.user,
        profile: a,
        roles: c
      }
    };
  };
}, R = async ({
  fastify: e,
  subject: s,
  templateData: r = {},
  templateName: o,
  to: n
}) => {
  const { config: t, mailer: i, log: a } = e;
  return i.sendMail({
    subject: s,
    templateName: o,
    to: n,
    templateData: {
      appName: t.appName,
      ...r
    }
  }).catch((c) => {
    throw a.error(c.stack), {
      name: "SEND_EMAIL",
      message: c.message,
      statusCode: 500
    };
  });
}, B = (e, s) => {
  const { config: r, log: o } = s;
  return async (n) => {
    if (r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    const t = await e.emailPasswordSignUp(
      n
    );
    if (r.user.supertokens.sendUserAlreadyExistsWarning && t.status === "EMAIL_ALREADY_EXISTS_ERROR")
      try {
        await R({
          fastify: s,
          subject: "Duplicate Email Registration",
          templateData: {
            emailId: n.email
          },
          templateName: "duplicate-email-warning",
          to: n.email
        });
      } catch (i) {
        o.error(i);
      }
    return t;
  };
}, $ = (e, s) => {
  const { log: r, config: o } = s;
  return async (n) => {
    if (e.emailPasswordSignUpPOST === void 0)
      throw new Error("Should never come here");
    const t = await e.emailPasswordSignUpPOST(n);
    if (t.status === "OK") {
      const i = await l.addRoleToUser(
        t.user.id,
        o.user.role || "USER"
      );
      i.status !== "OK" && r.error(i.status);
      const { roles: a } = await l.getRolesForUser(
        t.user.id
      );
      return {
        status: "OK",
        user: {
          ...t.user,
          /* eslint-disable-next-line unicorn/no-null */
          profile: null,
          roles: a
        },
        session: t.session
      };
    }
    return t;
  };
}, K = (e) => {
  const { config: s } = e, r = s.appOrigin[0], o = "/reset-password";
  return async (n) => {
    await R({
      fastify: e,
      subject: "Reset Password",
      templateName: "reset-password",
      to: n.user.email,
      templateData: {
        passwordResetLink: n.passwordResetLink.replace(
          r + "/auth/reset-password",
          r + (s.user.supertokens.resetPasswordPath ? s.user.supertokens.resetPasswordPath : o)
        )
      }
    });
  };
}, H = (e, s) => {
  const { config: r } = s;
  return async (o) => {
    if (!await k(
      o.thirdPartyId,
      o.thirdPartyUserId,
      o.userContext
    ) && r.user.features?.signUp === !1)
      throw {
        name: "SIGN_UP_DISABLED",
        message: "SignUp feature is currently disabled",
        statusCode: 404
      };
    return await e.thirdPartySignInUp(o);
  };
}, J = (e, s) => {
  const { log: r, config: o } = s;
  return async (n) => {
    if (e.thirdPartySignInUpPOST === void 0)
      throw new Error("Should never come here");
    const t = await e.thirdPartySignInUpPOST(n);
    if (t.status === "OK" && t.createdNewUser) {
      const i = await l.addRoleToUser(
        t.user.id,
        o.user.role || "USER"
      );
      i.status !== "OK" && r.error(i.status);
      const { roles: a } = await l.getRolesForUser(
        t.user.id
      ), c = {
        ...t.user,
        /* eslint-disable-next-line unicorn/no-null */
        profile: null,
        roles: a
      };
      return {
        status: "OK",
        createdNewUser: t.createdNewUser,
        user: c,
        session: t.session,
        authCodeResponse: t.authCodeResponse
      };
    }
    return t;
  };
}, M = (e) => {
  const { Apple: s, Facebook: r, Github: o, Google: n } = d, t = e.user.supertokens.providers, i = [], a = [
    { name: "google", initProvider: n },
    { name: "github", initProvider: o },
    { name: "facebook", initProvider: r },
    { name: "apple", initProvider: s }
  ];
  for (const c of a)
    t?.[c.name] && i.push(
      c.initProvider(t[c.name])
    );
  return i;
}, V = (e, s) => {
  const r = e.split("@")?.[1];
  return r ? !!s.includes(r) : !1;
}, W = (e) => {
  const { config: s } = e;
  return {
    override: {
      apis: (r) => ({
        ...r,
        emailPasswordSignUpPOST: $(
          r,
          e
        ),
        thirdPartySignInUpPOST: J(
          r,
          e
        )
      }),
      functions: (r) => ({
        ...r,
        emailPasswordSignIn: A(
          r,
          e
        ),
        emailPasswordSignUp: B(
          r,
          e
        ),
        thirdPartySignInUp: H(
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
            const o = /^([\w+.]+)(\w)(@)(\w+)(\.\w+)+$/, n = s.user.supertokens.supportedEmailDomains;
            if (!o.test(r))
              return "Email is invalid";
            if (n && n.filter((t) => !!t).length !== 0 && !V(
              r,
              s.user.supertokens.supportedEmailDomains
            ))
              return "Unsupported Email Domain";
          }
        }
      ]
    },
    emailDelivery: {
      override: (r) => ({
        ...r,
        sendEmail: K(e)
      })
    },
    providers: M(s)
  };
}, G = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.thirdPartyEmailPassword ? d.init(
    s.thirdPartyEmailPassword(e)
  ) : d.init(
    W(e)
  );
}, Q = () => ({}), j = (e) => {
  const s = e.config.user.supertokens.recipes;
  return s && s.userRoles ? l.init(s.userRoles(e)) : l.init(Q());
}, z = (e) => [
  F(e),
  G(e),
  j(e)
], X = (e) => {
  const { config: s } = e;
  S.init({
    appInfo: {
      apiDomain: s.baseUrl,
      appName: s.appName,
      websiteDomain: s.appOrigin[0]
    },
    recipeList: z(e),
    supertokens: {
      connectionURI: s.user.supertokens.connectionUri
    }
  });
}, Y = async (e, s, r) => {
  const { config: o, log: n } = e;
  n.info("Registering supertokens plugin"), X(e), e.setErrorHandler(O()), e.register(y, {
    origin: o.appOrigin,
    allowedHeaders: [
      "Content-Type",
      "st-auth-mode",
      ...S.getAllCORSHeaders()
    ],
    credentials: !0
  }), e.register(E), e.register(I), n.info("Registering supertokens plugin complete"), e.decorate("verifySession", b), r();
}, Z = h(Y), x = async (e, s, r) => {
  const { config: o, slonik: n } = s, i = (await m.getSession(s, D(r), {
    sessionRequired: !1
  }))?.getUserId();
  if (i) {
    const a = new g(o, n), c = await d.getUserById(i);
    if (c) {
      let u = null;
      const { roles: p } = await l.getRolesForUser(i);
      try {
        u = await a.findById(i);
      } catch {
      }
      const w = {
        ...c,
        profile: u,
        roles: p
      };
      e.user = w;
    }
  }
}, q = h(
  async (e, s, r) => {
    const { mercurius: o } = e.config;
    await e.register(Z), o.enabled && await e.register(C), r();
  }
);
q.updateContext = x;
const ee = {
  user: async (e, s, r) => await new g(r.config, r.database).findById(s.id),
  users: async (e, s, r) => await new g(r.config, r.database).list(
    s.limit,
    s.offset,
    s.filters ? JSON.parse(JSON.stringify(s.filters)) : void 0,
    s.sort ? JSON.parse(JSON.stringify(s.sort)) : void 0
  )
}, Pe = { Query: ee }, Se = async (e, s, r) => {
  const o = "/users";
  e.get(
    o,
    {
      preHandler: e.verifySession()
    },
    async (n, t) => {
      const i = new g(n.config, n.slonik), { limit: a, offset: c, filters: u, sort: p } = n.query, w = await i.list(
        a,
        c,
        u ? JSON.parse(u) : void 0,
        p ? JSON.parse(p) : void 0
      );
      t.send(w);
    }
  ), r();
};
class f {
  config;
  database;
  constructor(s, r) {
    this.config = s, this.database = r;
  }
  changePassword = async (s, r, o) => {
    const n = await d.getUserById(s), t = /^(?=.*?[a-z]).{8,}$/, i = /^(?=.*?\d).{8,}$/;
    if (!/^.{8,}$/.test(o))
      return {
        status: "FIELD_ERROR",
        message: "Password must contain at least 8 characters"
      };
    if (!t.test(o))
      return {
        status: "FIELD_ERROR",
        message: "Password must contain at least one lower case alphabet"
      };
    if (!i.test(o))
      return {
        status: "FIELD_ERROR",
        message: "Password must contain at least one number"
      };
    if (r && o)
      if (n)
        if ((await d.emailPasswordSignIn(
          n.email,
          r
        )).status === "OK") {
          if (await d.updateEmailOrPassword({
            userId: s,
            password: o
          }))
            return await m.revokeAllSessionsForUser(s), {
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
    const r = await d.getUserById(s), o = new g(this.config, this.database);
    let n = null;
    try {
      n = await o.findById(s);
    } catch {
    }
    const t = await l.getRolesForUser(s);
    return {
      email: r?.email,
      id: s,
      profile: n,
      roles: t.roles,
      timeJoined: r?.timeJoined
    };
  };
}
const se = {
  changePassword: async (e, s, r) => {
    const o = new f(r.config, r.database);
    try {
      return r.user?.id ? await o.changePassword(
        r.user?.id,
        s.oldPassword,
        s.newPassword
      ) : {
        status: "NOT_FOUND",
        message: "User not found"
      };
    } catch (n) {
      r.app.log.error(n);
      const t = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return t.statusCode = 500, t;
    }
  }
}, re = {
  me: async (e, s, r) => {
    const o = new f(r.config, r.database);
    if (r.user?.id)
      return o.getUserById(r.user.id);
    {
      r.app.log.error("Cound not get user id from mercurius context");
      const n = new P.ErrorWithProps(
        "Oops, Something went wrong"
      );
      return n.statusCode = 500, n;
    }
  }
}, Re = { Mutation: se, Query: re }, Ue = async (e, s, r) => {
  const o = "/change_password", n = "/me";
  e.post(
    o,
    {
      preHandler: e.verifySession()
    },
    async (t, i) => {
      try {
        const a = t.session, c = t.body, u = a && a.getUserId();
        if (!u)
          throw new Error("User not found in session");
        const p = c.oldPassword ?? "", w = c.newPassword ?? "", U = await new f(t.config, t.slonik).changePassword(
          u,
          p,
          w
        );
        i.send(U);
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
    async (t, i) => {
      const a = new f(t.config, t.slonik), c = t.session?.getUserId();
      if (c)
        i.send(await a.getUserById(c));
      else
        throw e.log.error("Cound not get user id from session"), new Error("Oops, Something went wrong");
    }
  ), r();
};
export {
  g as UserProfileService,
  f as UserService,
  q as default,
  Pe as userProfileResolver,
  Se as userProfileRoutes,
  Re as userResolver,
  Ue as userRoutes
};
