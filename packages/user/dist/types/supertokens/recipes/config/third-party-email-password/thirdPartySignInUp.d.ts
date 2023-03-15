import type { FastifyInstance } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/thirdpartyemailpassword";
declare const thirdPartySignInUp: (originalImplementation: RecipeInterface, fastify: FastifyInstance) => (input: {
    thirdPartyId: string;
    thirdPartyUserId: string;
    email: string;
    userContext: any;
}) => Promise<{
    status: "OK";
    createdNewUser: boolean;
    user: import("supertokens-node/recipe/thirdpartyemailpassword").User;
}>;
export default thirdPartySignInUp;
//# sourceMappingURL=thirdPartySignInUp.d.ts.map