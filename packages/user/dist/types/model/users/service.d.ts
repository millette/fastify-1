import { BaseService } from "@dzangolab/fastify-slonik";
import UserSqlFactory from "./sqlFactory";
import type { ApiConfig } from "@dzangolab/fastify-config";
import type { Database, Service } from "@dzangolab/fastify-slonik";
import type { QueryResultRow } from "slonik";
declare class UserService<User extends QueryResultRow, UserCreateInput extends QueryResultRow, UserUpdateInput extends QueryResultRow> extends BaseService<User, UserCreateInput, UserUpdateInput> implements Service<User, UserCreateInput, UserUpdateInput> {
    constructor(config: ApiConfig, database: Database);
    static readonly LIMIT_DEFAULT = 20;
    static readonly LIMIT_MAX = 50;
    get table(): string;
    get factory(): UserSqlFactory<User, UserCreateInput, UserUpdateInput>;
    changePassword: (userId: string, oldPassword: string, newPassword: string) => Promise<{
        status: string;
        message: string | undefined;
    } | {
        status: string;
        message?: undefined;
    }>;
}
export default UserService;
//# sourceMappingURL=service.d.ts.map