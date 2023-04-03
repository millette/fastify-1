import type { UserProfile } from "../../types";
import type { ApiConfig } from "@dzangolab/fastify-config";
import type { Database } from "@dzangolab/fastify-slonik";
declare class UserService {
    config: ApiConfig;
    database: Database;
    constructor(config: ApiConfig, database: Database);
    changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<{
        status: string;
        message: string | undefined;
    } | {
        status: string;
        message?: undefined;
    }>;
    getUserById: (userId: string) => Promise<{
        email: string | undefined;
        id: string;
        profile: UserProfile | null;
        roles: string[];
        timeJoined: number | undefined;
    }>;
}
export default UserService;
//# sourceMappingURL=service.d.ts.map