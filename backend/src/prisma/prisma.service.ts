import { Injectable } from '@nestjs/common';
import type { PrismaClient } from '@prisma/client';
import { TenantContextService } from '../tenant/tenant-context.service';

/**
 * 呼び出し側(customer.service.ts等)は今まで通り`this.prisma.customer.findMany()`のように
 * 使えるが、実体は現在のテナント(会社)のPrismaClientにProxyで委譲される。
 * これにより既存の全モジュールを書き換えずに会社ごとのDB分離に対応できる。
 *
 * `interface`宣言をマージすることで、TypeScript上はPrismaClientの全メンバーを
 * 持つ型として扱われる(実行時の型はProxyなので実際にアクセス可能)。
 */
export interface PrismaService extends PrismaClient {}

@Injectable()
export class PrismaService {
  constructor(private readonly tenantContext: TenantContextService) {
    return new Proxy(this, {
      get: (target, prop, receiver) => {
        if (Reflect.has(target, prop)) {
          return Reflect.get(target, prop, receiver);
        }

        // NestJSの起動処理は、全プロバイダに対して`onModuleInit`等のライフサイクル
        // フックの有無や`then`(thenable判定)をダックタイピングで探る。これらは
        // テナントコンテキストが無い時点(アプリ起動時)でも発生するため、その場合は
        // 例外にせずundefinedを返す。実データ操作は必ずテナント確立後にしか呼ばれない。
        const store = target.tenantContext.current();

        if (!store) return undefined;

        return Reflect.get(store.prisma, prop);
      },
    }) as PrismaService;
  }
}
