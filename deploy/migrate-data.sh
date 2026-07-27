#!/usr/bin/env bash
# deploy/migrate-data.sh
#
# ローカルPCの本番データ(マスターDB + 全テナントDB)をpg_dumpで書き出し、
# VPSへscpで転送し、VPS側のPostgreSQLへ流し込む。
#
# 実行場所: このスクリプトはローカルPC(今バックエンドを動かしているWindows機)の
# Git Bash等で実行する。
#
# 事前に必要なもの:
#   - ローカルに psql / pg_dump がPATHに通っていること
#     (通っていない場合は下のPG_BIN変数にフルパスを指定する)
#   - VPSへパスワード無しでSSH接続できる状態(鍵認証を設定しておく)
#   - 実行前に、ローカルのバックエンドを止めておくこと(データ整合性のため)
#
# 使い方:
#   VPS_HOST=xxx.xxx.xxx.xxx VPS_USER=root bash deploy/migrate-data.sh

set -euo pipefail

PG_BIN="${PG_BIN:-}"   # 例: PG_BIN="/c/Program Files/PostgreSQL/16/bin/" (末尾スラッシュ必須、通常は空でよい。環境変数で上書き可能)
LOCAL_PG_HOST="localhost"
LOCAL_PG_PORT="5432"
LOCAL_PG_USER="postgres"
MASTER_DB="dream_garage_master"

VPS_HOST="${VPS_HOST:?VPS_HOST を指定してください(例: VPS_HOST=xxx.xxx.xxx.xxx)}"
VPS_USER="${VPS_USER:-root}"
VPS_PG_USER="${VPS_PG_USER:-garage}"

DUMP_DIR="$(mktemp -d)"
echo "一時ダンプ先: $DUMP_DIR"

echo "== マスターDBから対象のテナントDB一覧を取得 =="
# Windows版psql.exeの出力はCRLFになるため、\rが行末にくっついて壊れた
# データベース名にならないよう明示的に取り除く
TENANT_DBS=$("${PG_BIN}psql" -h "$LOCAL_PG_HOST" -p "$LOCAL_PG_PORT" -U "$LOCAL_PG_USER" -d "$MASTER_DB" -t -A -c "SELECT \"dbName\" FROM \"CompanyAccount\";" | tr -d '\r')

echo "対象テナントDB:"
echo "$TENANT_DBS"

echo "== マスターDBをダンプ =="
"${PG_BIN}pg_dump" -h "$LOCAL_PG_HOST" -p "$LOCAL_PG_PORT" -U "$LOCAL_PG_USER" -Fc "$MASTER_DB" > "$DUMP_DIR/$MASTER_DB.dump"

for db in $TENANT_DBS; do
  echo "== ${db} をダンプ =="
  "${PG_BIN}pg_dump" -h "$LOCAL_PG_HOST" -p "$LOCAL_PG_PORT" -U "$LOCAL_PG_USER" -Fc "$db" > "$DUMP_DIR/$db.dump"
done

echo "== VPSへ転送 =="
scp "$DUMP_DIR"/*.dump "${VPS_USER}@${VPS_HOST}:/tmp/"

echo "== VPS側でリストア =="
for f in "$DUMP_DIR"/*.dump; do
  dbname="$(basename "$f" .dump)"
  echo "-- ${dbname} を復元 --"
  ssh "${VPS_USER}@${VPS_HOST}" "sudo -u postgres createdb -O ${VPS_PG_USER} ${dbname} 2>/dev/null; sudo -u postgres pg_restore -d ${dbname} --clean --if-exists --no-owner --role=${VPS_PG_USER} /tmp/${dbname}.dump"
done

echo "== VPS側の一時ファイルを削除 =="
ssh "${VPS_USER}@${VPS_HOST}" "rm -f /tmp/*.dump"

echo "完了しました。ローカルのダンプは念のため残してあります: $DUMP_DIR"
echo "問題なく動作確認できたら、このディレクトリは手動で削除してください。"
