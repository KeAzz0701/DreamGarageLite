# クラウド移行手順(さくらのVPS)

ローカルPC運用からさくらのVPSへ移行するための手順書。実行するタイミングはユーザー側で決めてください(本番データ移行を伴うため、切り替え中の数分〜数十分はLINE返信・Webアプリが停止します)。

## フェーズ0: VPS契約(ここだけは必ずご自身で)

1. さくらのVPSでアカウント作成、2GBプラン(月額1,700円台)・OS Ubuntu 24.04 LTSでサーバー作成
2. 作成後に発行されるIPアドレスと、SSH接続用のパスワード(または鍵)を控える
3. `ssh root@<IPアドレス>` で一度接続できることを確認する

## フェーズ1: 初期セットアップ

VPSに接続した状態で、このリポジトリの `deploy/setup-vps.sh` を実行する。

```
curl -fsSL https://raw.githubusercontent.com/KeAzz0701/DreamGarageLite/main/deploy/setup-vps.sh -o setup-vps.sh
sudo bash setup-vps.sh
```

スクリプト実行後、画面の案内に従って:
1. PostgreSQLにユーザー・データベースを作成
2. `backend/.env` を `deploy/env.production.example` を参考に作成(DBの接続情報だけ書き換え、他は今のローカルの`.env`の値をコピー)
3. `frontend/.env.local` を `deploy/env.frontend.production.example` を参考に作成(`NEXT_PUBLIC_LIFF_ID`等はビルド時に埋め込まれるため、フロントエンドの`npm run build`より前に必ず用意する)
4. `npm install` → `prisma migrate deploy`(両スキーマ) → `npm run build`(バックエンド・フロントエンド両方)

この時点ではまだ空のデータベースで、動作確認のみ行う(下記「検証」参照)。

## フェーズ2: systemdサービスの登録

```
sudo cp deploy/garage-backend.service deploy/garage-frontend.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable garage-backend garage-frontend
sudo systemctl start garage-backend garage-frontend
sudo systemctl status garage-backend garage-frontend
```

これで、VPSを再起動してもサービスが自動的に立ち上がるようになる。

## フェーズ3: 本番データの移行(切り替え当日)

1. ローカルPCのバックエンドを停止する(影響をこの時間だけに抑えるため)
2. ローカルPCのGit Bashで:
   ```
   VPS_HOST=<VPSのIPアドレス> VPS_USER=root bash deploy/migrate-data.sh
   ```
3. VPS側でテーブル件数などをざっと確認する(下記「検証」参照)

## フェーズ4: 切り替え

1. VPS上でバックエンド・フロントエンドが正常に動いていることを確認(`curl localhost:3001/api`、`curl localhost:3000`)
2. ローカルPCの`cloudflared`を停止する
3. `C:\Users\user\.cloudflared\` フォルダ一式(config.yml + 認証情報のjsonファイル)をVPSにコピーする:
   ```
   scp -r C:\Users\user\.cloudflared root@<VPSのIPアドレス>:/root/.cloudflared
   ```
4. VPS上でcloudflaredをサービス登録して起動する:
   ```
   sudo cloudflared service install
   sudo systemctl start cloudflared
   ```
5. 実際にWebアプリ(app.dreamgaragelite.com)・LINE返信・管理画面が新環境で動くことを確認する
6. 問題なければローカルPCのNode/Postgresプロセスを停止する(データはしばらく消さずに残す)

## フェーズ5: 移行後の後片付け

- `SESSION_JWT_SECRET`を新しいランダム値に差し替える(全員再ログインが必要になる旨を事前に周知)
  ```
  node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
  ```
  で生成した値を`backend/.env`に設定し、`sudo systemctl restart garage-backend`
- 数日〜1週間、問題が起きないことを確認してから、ローカルPC側の`cloudflared`・不要になったバックアップを整理する

## 検証チェックリスト

- [ ] フェーズ1の後: `curl localhost:3001/api`・`curl localhost:3000` がそれぞれ応答する
- [ ] フェーズ3の後: VPS側のPostgresで全社分のDB(マスター+テナント全て)のテーブル件数がローカルと一致する
- [ ] フェーズ4の後: LINEでお客様役・スタッフ役としてメッセージを送り、返信が届く。Webアプリにログインして顧客一覧・予約・設定が表示される
- [ ] 移行完了から数日は、ローカルPC側のDBバックアップ(pg_dump)を保持し、いつでも切り戻せる状態を保つ

## 今後のコード更新時の運用

CI/CDは今回作っていないため、コードを更新するたびに以下を手動で行う:

```
ssh root@<VPSのIPアドレス>
cd /opt/garage-karte
git pull
cd backend && npm install && npx prisma migrate deploy && npm run build
cd ../frontend && npm install && npm run build
sudo systemctl restart garage-backend garage-frontend
```
