#!/usr/bin/env bash
# deploy/setup-vps.sh
#
# さくらのVPS(Ubuntu 24.04 LTS想定)上で、初回セットアップとして実行するスクリプト。
# Node.js・PostgreSQL・cloudflaredをインストールし、リポジトリをclone、
# .envを配置、依存インストール・マイグレーション・ビルドまでを行う。
#
# 使い方:
#   1. VPSにSSH接続する
#   2. このファイルをVPSにコピーする(scpで送るか、直接リポジトリをcloneしてから実行)
#   3. sudo bash setup-vps.sh を実行する
#
# 前提: このスクリプトは「まだ何も入っていないUbuntu」に対して実行する。
# 本番データの投入(migrate-data.sh)はこのスクリプトの後、別途行う。

set -euo pipefail

REPO_URL="https://github.com/KeAzz0701/DreamGarageLite.git"
APP_DIR="/opt/garage-karte"
APP_USER="garage"

if [ "$(id -u)" -ne 0 ]; then
  echo "root権限で実行してください(例: sudo bash setup-vps.sh)"
  exit 1
fi

echo "== 1. パッケージ更新 =="
apt-get update -y
apt-get upgrade -y

echo "== 2. Node.js 24.x のインストール =="
if ! command -v node >/dev/null 2>&1; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | bash -
  apt-get install -y nodejs
fi
node -v
npm -v

echo "== 3. PostgreSQL のインストール =="
apt-get install -y postgresql postgresql-contrib
systemctl enable postgresql
systemctl start postgresql

echo "== 4. cloudflared のインストール =="
if ! command -v cloudflared >/dev/null 2>&1; then
  curl -fsSL -o /tmp/cloudflared.deb \
    https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-amd64.deb
  dpkg -i /tmp/cloudflared.deb
fi
cloudflared --version

echo "== 5. アプリ専用ユーザーの作成 =="
if ! id -u "$APP_USER" >/dev/null 2>&1; then
  useradd -m -s /bin/bash "$APP_USER"
fi

echo "== 6. リポジトリのclone =="
if [ ! -d "$APP_DIR" ]; then
  git clone "$REPO_URL" "$APP_DIR"
else
  echo "既に $APP_DIR が存在するため、git pull のみ行います"
  git -C "$APP_DIR" pull
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

echo "=================================================="
echo "ここまで完了しました。次に手動で行うこと:"
echo "1. PostgreSQLに本番用のユーザー・データベースを作成する(例):"
echo "   sudo -u postgres psql -c \"CREATE USER garage WITH PASSWORD '選んだパスワード';\""
echo "   sudo -u postgres psql -c \"CREATE DATABASE dream_garage_master OWNER garage;\""
echo "   sudo -u postgres psql -c \"CREATE DATABASE dream_garage_lite OWNER garage;\""
echo "   (他のテナント会社のDBがあれば、同様にCREATE DATABASEを追加する)"
echo ""
echo "2. $APP_DIR/backend/.env を deploy/env.production.example を参考に作成する"
echo "   (DATABASE_URL・DATABASE_URL_MASTERを上で作ったユーザー/DB名に合わせる。"
echo "    それ以外の値は今お使いのローカルの.envの値をそのままコピーする)"
echo ""
echo "2b. $APP_DIR/frontend/.env.local を deploy/env.frontend.production.example を参考に作成する"
echo "    (NEXT_PUBLIC_LIFF_ID等はビルド時に埋め込まれるため、frontendのビルドより前に必ず用意すること)"
echo ""
echo "3. 依存インストール・ビルド・マイグレーションを行う:"
echo "   cd $APP_DIR/backend && sudo -u $APP_USER npm install"
echo "   cd $APP_DIR/backend && sudo -u $APP_USER npx prisma migrate deploy"
echo "   cd $APP_DIR/backend && sudo -u $APP_USER npx prisma migrate deploy --config prisma-master.config.ts"
echo "   cd $APP_DIR/backend && sudo -u $APP_USER npm run build"
echo "   cd $APP_DIR/frontend && sudo -u $APP_USER npm install"
echo "   cd $APP_DIR/frontend && sudo -u $APP_USER npm run build"
echo ""
echo "4. deploy/garage-backend.service, deploy/garage-frontend.service を"
echo "   /etc/systemd/system/ にコピーして起動する(手順はdeploy/README.md参照)"
echo "=================================================="
