import type { FastifyInstance } from "fastify";
import type { RecipeInterface } from "supertokens-node/recipe/thirdpartyemailpassword/types";
declare const emailPasswordSignIn: (originalImplementation: RecipeInterface, fastify: FastifyInstance) => (input: {
    email: string;
    password: string;
    userContext: any;
}) => Promise<{
    status: "OK";
    user: import("supertokens-node/recipe/thirdpartyemailpassword/types").User;
} | {
    status: "WRONG_CREDENTIALS_ERROR";
}>;
export default emailPasswordSignIn;
//# sourceMappingURL=emailPasswordSignIn.d.ts.map