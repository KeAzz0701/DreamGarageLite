# backend/assets/ について

このフォルダの `official-forms/`(官公庁が公開する車検・登録関連PDF様式)と
`fonts/`(PDFへの日本語印字に使うフォント)は、コードではなくデータのため
gitでは追跡していません(`.gitignore`参照)。リポジトリを新しく clone した
場合や、新しいサーバーにデプロイする場合は、このフォルダを別途配置してください。

## 中身

- `official-forms/` — `車関係公的書類_目録と手続別チェックリスト.md` に一覧がある、
  国土交通省・北海道運輸局・北海道警察が公開する公式PDF様式一式(全22種)。
  取得元URLは同ファイル内に記載。
- `fonts/NotoSansJP-Regular.ttf` — pdf-lib + fontkit でPDFに日本語(氏名・住所等)を
  上書き印字するために使う埋め込みフォント。Google Fonts「Noto Sans JP」(OFLライセンス)の
  可変フォントから、`fonttools varLib.instancer` でRegular(wght=400)の静的インスタンスを
  抽出したもの(約5.8MB)。**subset化するとPDF内で一部の文字(漢字・かな・数字を問わず)が
  欠落する不具合をpdf-lib 1.17.1 + fontkitの組み合わせで確認済みのため、埋め込み時は必ず
  `{ subset: false }` を指定すること**(`official-document.service.ts` 参照)。
  以前は`NotoSansCJKjp-Regular.otf`(汎CJK版、16.4MB)を使っていたが、subset:false前提だと
  生成PDFが1書類あたり約14MBに膨れ、ブラウザでのプレビューが実質固まる不具合があったため、
  日本語専用で軽量なこのフォントに差し替えた(埋め込み後サイズは約14MB→約3.5MB)。

## 本番サーバーでの配置

新しいサーバーには `scp -r` 等でこのフォルダをそのまま
`/opt/garage-karte/backend/assets/` にコピーしてください。中身自体は
コードのデプロイ(`git pull`)とは独立して更新されるため、様式が改版された
場合もこのフォルダだけ差し替えれば反映されます。

## 注意: 軽自動車PDF(軽第1号様式・軽第3号様式)はpdf-lib用に再生成済み

`02_軽自動車_検査・名義変更/軽自動車_軽第1号様式.pdf` と `軽自動車_軽第3号様式.pdf` は、
配布元の元PDFの内部構造(xref/ページツリー)が壊れており、pdf-lib(`PDFDocument.load`)が
`Expected instance of PDFDict, but got instance of undefined` で例外を投げて自動入力が
500エラーになる不具合があった。PyMuPDF(fitz)は寛容にパースできるため、
`doc.save(out, garbage=4, deflate=True, clean=True)` で構造を再構築した版に
差し替え済み(見た目・座標は元PDFと同一)。**この2ファイルを元の配布元PDFで
上書きすると自動入力が再び500エラーになるので注意。** 他の様式PDFを追加・更新する際、
同様のエラーが出た場合はこの手順(PyMuPDFで開いて`clean=True`で再保存)を踏むこと。
