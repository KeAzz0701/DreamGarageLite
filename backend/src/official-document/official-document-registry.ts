// backend/src/official-document/official-document-registry.ts

import type { Vehicle } from '@prisma/client';

/** 官公庁様式に上書き印刷するテキスト1件分。座標は「見た目の(左上原点・下向きがy+)」ポイント指定 */
export type OverlayField = {
  visualX: number;
  visualY: number;
  size: number;
  text: (vehicle: Vehicle) => string;
};

export type OfficialDocument = {
  id: string;
  category: string;
  label: string;
  description: string;
  /** assets/official-forms/ からの相対パス */
  filePath: string;
  /** 実際の印刷対象がテナントのVehicleデータで埋められる場合のみ設定 */
  fields?: OverlayField[];
};

export type ProcedureBundle = {
  id: string;
  label: string;
  description: string;
  documentIds: string[];
};

const D = (
  id: string,
  category: string,
  label: string,
  description: string,
  filePath: string,
  fields?: OverlayField[],
): OfficialDocument => ({ id, category, label, description, filePath, fields });

/** 継続検査申請書(専用第3号様式)。回転90度・A4横向き様式。氏名・住所欄のみ自動入力対応 */
const continuationInspectionFields: OverlayField[] = [
  {
    visualX: 90,
    visualY: 331,
    size: 9,
    text: (v) => v.userName || v.ownerName || '',
  },
  {
    visualX: 55,
    visualY: 353,
    size: 8,
    text: (v) => v.userAddress || v.ownerAddress || '',
  },
  {
    visualX: 90,
    visualY: 386,
    size: 9,
    text: (v) => v.userName || v.ownerName || '',
  },
  {
    visualX: 55,
    visualY: 409,
    size: 8,
    text: (v) => v.userAddress || v.ownerAddress || '',
  },
];

/** 自動車重量税納付書(検査自動車)。回転なし・A4横向き様式 */
const weightTaxFields: OverlayField[] = [
  {
    visualX: 185,
    visualY: 155,
    size: 10,
    text: (v) => v.registrationNumber || v.vin || '',
  },
  {
    visualX: 465,
    visualY: 118,
    size: 10,
    text: (v) => v.userName || v.ownerName || '',
  },
  {
    visualX: 465,
    visualY: 152,
    size: 9,
    text: (v) => v.userAddress || v.ownerAddress || '',
  },
];

/** 手数料納付書。回転なし・A4横向き様式 */
const feeFields: OverlayField[] = [
  {
    visualX: 200,
    visualY: 90,
    size: 9,
    text: (v) => v.registrationNumber || v.vin || '',
  },
  {
    visualX: 480,
    visualY: 90,
    size: 9,
    text: (v) => v.userName || v.ownerName || '',
  },
];

/** OCR第1号様式(新規・移転登録)。回転90度・A4横向き様式。申請人・使用者の氏名住所欄のみ自動入力対応 */
const ocr1Fields: OverlayField[] = [
  {
    visualX: 90,
    visualY: 513,
    size: 9,
    text: (v) => v.userName || v.ownerName || '',
  },
  {
    visualX: 90,
    visualY: 532,
    size: 8,
    text: (v) => v.userAddress || v.ownerAddress || '',
  },
  {
    visualX: 90,
    visualY: 557,
    size: 9,
    text: (v) => v.userName || v.ownerName || '',
  },
  {
    visualX: 90,
    visualY: 576,
    size: 8,
    text: (v) => v.userAddress || v.ownerAddress || '',
  },
];

/** 委任状。回転なし・A4横向き様式。委任者(左側)の氏名住所と登録番号のみ自動入力対応 */
const powerOfAttorneyFields: OverlayField[] = [
  {
    visualX: 340,
    visualY: 435,
    size: 9,
    text: (v) => v.userName || v.ownerName || '',
  },
  {
    visualX: 340,
    visualY: 480,
    size: 8,
    text: (v) => v.userAddress || v.ownerAddress || '',
  },
  {
    visualX: 430,
    visualY: 290,
    size: 9,
    text: (v) => v.registrationNumber || v.vin || '',
  },
];

/** 譲渡証明書。回転なし・A4横向き様式。車両情報(車名・型式・車台番号・原動機の型式)のみ自動入力対応 */
const transferCertificateFields: OverlayField[] = [
  {
    visualX: 65,
    visualY: 218,
    size: 9,
    text: (v) => v.carName || v.commonModelName || '',
  },
  {
    visualX: 135,
    visualY: 218,
    size: 9,
    text: (v) => v.model || '',
  },
  {
    visualX: 195,
    visualY: 218,
    size: 9,
    text: (v) => v.vin || '',
  },
  {
    visualX: 305,
    visualY: 218,
    size: 8,
    text: (v) => v.engineModel || '',
  },
];

export const OFFICIAL_DOCUMENTS: OfficialDocument[] = [
  // 01_普通車_継続検査・登録
  D(
    'ordinary-ocr1-new-transfer',
    '01_普通車_継続検査・登録',
    'OCR第1号様式(新規・移転登録)',
    '新規登録・移転登録等に使用します。申請人(使用者)の氏名・住所を自動入力できます',
    '01_普通車_継続検査・登録/普通車_OCR第1号様式_新規・移転登録.pdf',
    ocr1Fields,
  ),
  D(
    'ordinary-ocr3-continuation',
    '01_普通車_継続検査・登録',
    'OCR第3号様式(継続検査)',
    '継続検査(車検)に使用します',
    '01_普通車_継続検査・登録/普通車_OCR第3号様式_継続検査.pdf',
  ),
  D(
    'ordinary-ocr3-2-temp-cancel',
    '01_普通車_継続検査・登録',
    'OCR第3号様式の2(一時抹消等)',
    '一時抹消登録等に使用します',
    '01_普通車_継続検査・登録/普通車_OCR第3号様式の2_一時抹消等.pdf',
  ),
  D(
    'ordinary-ocr3-3-permanent-cancel',
    '01_普通車_継続検査・登録',
    'OCR第3号様式の3(永久抹消等)',
    '永久抹消登録等に使用します',
    '01_普通車_継続検査・登録/普通車_OCR第3号様式の3_永久抹消等.pdf',
  ),
  D(
    'ordinary-dedicated3-continuation',
    '01_普通車_継続検査・登録',
    '専用第3号様式(継続検査申請書)',
    '継続検査(車検)の申請書です。使用者の氏名・住所を自動入力できます',
    '01_普通車_継続検査・登録/普通車_専用第3号様式_継続検査.pdf',
    continuationInspectionFields,
  ),
  D(
    'ordinary-weight-tax',
    '01_普通車_継続検査・登録',
    '自動車重量税納付書',
    '検査自動車用です。登録番号・使用者の氏名住所を自動入力できます',
    '01_普通車_継続検査・登録/普通車_自動車重量税納付書.pdf',
    weightTaxFields,
  ),
  D(
    'ordinary-fee',
    '01_普通車_継続検査・登録',
    '手数料納付書',
    '登録・検査等の手数料の納付に使用します。登録番号・所有者(使用者)氏名を自動入力できます',
    '01_普通車_継続検査・登録/普通車_手数料納付書.pdf',
    feeFields,
  ),
  D(
    'ordinary-power-of-attorney',
    '01_普通車_継続検査・登録',
    '委任状',
    '登録・検査申請を代理で行う場合に使用します。委任者の氏名・住所・登録番号を自動入力できます',
    '01_普通車_継続検査・登録/普通車_委任状.pdf',
    powerOfAttorneyFields,
  ),
  D(
    'ordinary-transfer-certificate',
    '01_普通車_継続検査・登録',
    '譲渡証明書',
    '普通車の移転登録(名義変更)に使用します。車名・型式・車台番号・原動機の型式を自動入力できます',
    '01_普通車_継続検査・登録/普通車_譲渡証明書.pdf',
    transferCertificateFields,
  ),

  // 02_軽自動車_検査・名義変更
  D(
    'kei-1',
    '02_軽自動車_検査・名義変更',
    '軽第1号様式',
    '新規検査・名義変更等に使用します',
    '02_軽自動車_検査・名義変更/軽自動車_軽第1号様式.pdf',
  ),
  D(
    'kei-3',
    '02_軽自動車_検査・名義変更',
    '軽第3号様式',
    '継続検査等に使用します',
    '02_軽自動車_検査・名義変更/軽自動車_軽第3号様式.pdf',
  ),
  D(
    'kei-dedicated-1',
    '02_軽自動車_検査・名義変更',
    '軽専用第1号様式',
    '所有者変更記録等に使用します',
    '02_軽自動車_検査・名義変更/軽自動車_軽専用第1号様式.pdf',
  ),
  D(
    'kei-dedicated-2',
    '02_軽自動車_検査・名義変更',
    '軽専用第2号様式',
    '継続検査用です',
    '02_軽自動車_検査・名義変更/軽自動車_軽専用第2号様式.pdf',
  ),
  D(
    'kei-request',
    '02_軽自動車_検査・名義変更',
    '申請依頼書',
    '代理申請用です',
    '02_軽自動車_検査・名義変更/軽自動車_申請依頼書.pdf',
  ),

  // 03_北海道_車庫証明
  D(
    'garage-certificate-application',
    '03_北海道_車庫証明',
    '自動車保管場所証明申請書',
    '普通車の車庫証明申請に使用します(北海道警察様式)',
    '03_北海道_車庫証明/北海道_自動車保管場所証明申請書.pdf',
  ),
  D(
    'garage-notification',
    '03_北海道_車庫証明',
    '自動車保管場所届出書',
    '軽自動車の車庫届出等に使用します(北海道警察様式)',
    '03_北海道_車庫証明/北海道_自動車保管場所届出書.pdf',
  ),
  D(
    'garage-self-certification',
    '03_北海道_車庫証明',
    '保管場所使用権原疎明書面(自認書)',
    '自己所有の保管場所の場合に使用します',
    '03_北海道_車庫証明/北海道_保管場所使用権原疎明書面_自認書.pdf',
  ),
  D(
    'garage-consent-certificate',
    '03_北海道_車庫証明',
    '保管場所使用承諾証明書',
    '借地・月極駐車場等の場合に使用します',
    '03_北海道_車庫証明/北海道_保管場所使用承諾証明書.pdf',
  ),
  D(
    'garage-location-map',
    '03_北海道_車庫証明',
    '保管場所の所在地・配置図',
    '保管場所証明の添付書類です',
    '03_北海道_車庫証明/北海道_保管場所所在地・配置図.pdf',
  ),

  // 04_中古車販売_許認可
  D(
    'used-car-dealer-license',
    '04_中古車販売_許認可',
    '古物商許可申請書',
    '中古車を反復継続して仕入・販売する営業の開始前に必要です(北海道警察様式)',
    '04_中古車販売_許認可/北海道_古物商許可申請書.pdf',
  ),
  D(
    'used-car-dealer-pledge',
    '04_中古車販売_許認可',
    '古物商 誓約書(個人用)',
    '古物商許可の個人申請時の添付様式です',
    '04_中古車販売_許認可/北海道_古物商_誓約書_個人用.pdf',
  ),
];

export const PROCEDURE_BUNDLES: ProcedureBundle[] = [
  {
    id: 'continuation-inspection',
    label: '継続検査(車検)一式',
    description: '専用第3号様式・重量税納付書・手数料納付書をまとめて印刷します',
    documentIds: ['ordinary-dedicated3-continuation', 'ordinary-weight-tax', 'ordinary-fee'],
  },
  {
    id: 'transfer-registration',
    label: '名義変更(移転登録)一式',
    description: 'OCR第1号様式・譲渡証明書・委任状・手数料納付書をまとめて印刷します',
    documentIds: [
      'ordinary-ocr1-new-transfer',
      'ordinary-transfer-certificate',
      'ordinary-power-of-attorney',
      'ordinary-fee',
    ],
  },
  {
    id: 'used-car-sale',
    label: '中古車販売(移転登録)一式',
    description: '中古車販売時の移転登録に必要な書類一式です。古物商許可は営業開始前に別途ご用意ください',
    documentIds: [
      'ordinary-ocr1-new-transfer',
      'ordinary-transfer-certificate',
      'ordinary-power-of-attorney',
      'ordinary-fee',
    ],
  },
  {
    id: 'new-car-registration',
    label: '新車新規登録一式',
    description: 'OCR第1号様式・重量税納付書・手数料納付書・委任状・車庫証明申請書をまとめて印刷します',
    documentIds: [
      'ordinary-ocr1-new-transfer',
      'ordinary-weight-tax',
      'ordinary-fee',
      'ordinary-power-of-attorney',
      'garage-certificate-application',
    ],
  },
];

export function getDocumentById(id: string): OfficialDocument | undefined {
  return OFFICIAL_DOCUMENTS.find((d) => d.id === id);
}
