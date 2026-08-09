# backend/assets/ について

このフォルダの `official-forms/`(官公庁が公開する車検・登録関連PDF様式)と
`fonts/`(PDFへの日本語印字に使うフォント)は、コードではなくデータのため
gitでは追跡していません(`.gitignore`参照)。リポジトリを新しく clone した
場合や、新しいサーバーにデプロイする場合は、このフォルダを別途配置してください。

## 中身

- `official-forms/` — `車関係公的書類_目録と手続別チェックリスト.md` に一覧がある、
  国土交通省・北海道運輸局・北海道警察が公開する公式PDF様式一式(全22種)。
  取得元URLは同ファイル内に記載。
- `fonts/NotoSansCJKjp-Regular.otf` — pdf-lib + fontkit でPDFに日本語(氏名・住所等)
  を上書き印字するために使う埋め込みフォント。**subset化すると一部環境で文字化け・
  レンダリング失敗するため、埋め込み時は必ず `{ subset: false }` を指定すること**
  (`official-document.service.ts` 参照)。

## 本番サーバーでの配置

新しいサーバーには `scp -r` 等でこのフォルダをそのまま
`/opt/garage-karte/backend/assets/` にコピーしてください。中身自体は
コードのデプロイ(`git pull`)とは独立して更新されるため、様式が改版された
場合もこのフォルダだけ差し替えれば反映されます。
