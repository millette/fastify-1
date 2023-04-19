import { DefaultSqlFactory } from "@dzangolab/fastify-slonik";
import type { SqlFactory } from "@dzangolab/fastify-slonik";
import type { QueryResultRow } from "slonik";
declare class UserSqlFactory<User extends QueryResultRow, UserCreateInput extends QueryResultRow, UserUpdateInput extends QueryResultRow> extends DefaultSqlFactory<User, UserCreateInput, UserUpdateInput> implements SqlFactory<User, UserCreateInput, UserUpdateInput> {
}
export default UserSqlFactory;
//# sourceMappingURL=sqlFactory.d.ts.map