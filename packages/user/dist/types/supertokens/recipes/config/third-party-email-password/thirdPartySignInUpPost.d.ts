import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";
declare const thirdPartySignInUpPOST: (originalImplementation: APIInterface, fastify: FastifyInstance) => ((input: {
    provider: import("supertokens-node/recipe/thirdpartyemailpassword").TypeProvider;
    code: string;
    redirectURI: string;
    authCodeResponse?: any;
    clientId?: string | undefined;
    options: import("supertokens-node/lib/build/recipe/thirdparty/types").APIOptions;
    userContext: any;
}) => Promise<import("supertokens-node/types").GeneralErrorResponse | {
    status: "OK";
    createdNewUser: boolean;
    user: import("supertokens-node/recipe/thirdpartyemailpassword/types").User;
    session: import("supertokens-node/recipe/session").SessionContainer;
    authCodeResponse: any;
} | {
    status: "NO_EMAIL_GIVEN_BY_PROVIDER";
}>) | undefined;
export default thirdPartySignInUpPOST;
//# sourceMappingURL=thirdPartySignInUpPost.d.ts.map