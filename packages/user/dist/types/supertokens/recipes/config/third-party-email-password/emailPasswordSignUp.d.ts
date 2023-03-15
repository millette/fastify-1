import type { FastifyInstance } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/thirdpartyemailpassword";
declare const emailPasswordSignUp: (originalImplementation: RecipeInterface, fastify: FastifyInstance) => (input: {
    email: string;
    password: string;
    userContext: any;
}) => Promise<{
    status: "OK";
    user: import("supertokens-node/recipe/thirdpartyemailpassword").User;
} | {
    status: "EMAIL_ALREADY_EXISTS_ERROR";
}>;
export default emailPasswordSignUp;
//# sourceMappingURL=emailPasswordSignUp.d.ts.map