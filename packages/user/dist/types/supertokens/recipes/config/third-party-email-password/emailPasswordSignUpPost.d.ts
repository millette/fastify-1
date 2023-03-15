import type { FastifyInstance } from "fastify";
import type { APIInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";
declare const emailPasswordSignUpPOST: (originalImplementation: APIInterface, fastify: FastifyInstance) => ((input: {
    formFields: {
        id: string;
        value: string;
    }[];
    options: import("supertokens-node/lib/build/recipe/emailpassword/types").APIOptions;
    userContext: any;
}) => Promise<{
    status: "OK";
    user: import("supertokens-node/recipe/thirdpartyemailpassword/types").User;
    session: import("supertokens-node/recipe/session").SessionContainer;
} | {
    status: "EMAIL_ALREADY_EXISTS_ERROR";
} | import("supertokens-node/types").GeneralErrorResponse>) | undefined;
export default emailPasswordSignUpPOST;
//# sourceMappingURL=emailPasswordSignUpPost.d.ts.map