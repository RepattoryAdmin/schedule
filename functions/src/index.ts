import {onRequest} from "firebase-functions/v2/https";
import {setGlobalOptions} from "firebase-functions/v2";
import {VertexAI} from "@google-cloud/vertexai";
import * as admin from "firebase-admin";
import {getStorage} from "firebase-admin/storage";

// Firebase Admin 初期化
if (!admin.apps.length) {
  admin.initializeApp();
}

setGlobalOptions({maxInstances: 10, region: "asia-northeast1"});

// Vertex AI 初期化
const vertexAI = new VertexAI({
  project: process.env.GCLOUD_PROJECT || "cooking-class-system",
  location: "us-central1",
});

// 固定情報
const CANCELLATION_POLICY = `
■ キャンセル・変更について
・開催日の 8日前まで のキャンセル・変更は、無料 にて承ります。
・開催日の7日前以降のキャンセル・変更はお受けできません。
（レシピやアーカイブ動画をお届けいたします。受講料のご返金はいたしかねますので、あらかじめご了承ください。）

■ 開催中止について
講師の都合、システム不具合、天災その他やむを得ない事情により講座の開催を中止する場合は、速やかにご連絡のうえ、全額返金または振替受講にて対応いたします。
`.trim();

const RESERVATION_NOTICE = `
予約締切：1日前の22:00まで

キャンセルポリシー
当日：代金の100％
7日前まで：代金の100％
`.trim();

// LINE告知文生成プロンプト
const getLinePrompt = (
  menu: string,
  datetime: string,
  duration: string,
  price: string,
  instructor: string,
  reservaUrl: string
) => `
あなたは料理教室の告知文を作成するアシスタントです。
以下の情報をもとに、LINE告知文を作成してください。

【トーン】
- 温かい、親しみやすい、ポジティブ、安心感がある
- 完璧を求める「厳しい先生」ではなく、一緒に頑張る「共感者・サポーター」
- です・ます調。適度に「！」「🍳」「✨」などの絵文字や記号を使い、親しみやすさを出す

【執筆ガイドライン】
- 共感から入る: 「忙しいですよね」「毎日お疲れ様です」といった、ユーザーの日常の苦労に寄り添う表現を入れる
- ハードルを下げる: 「画面オフOK」「見るだけOK」「材料変更自由」など、参加の心理的ハードルを下げるキーワードを意識する
- ベネフィットの提示: 単に「料理を作る」だけでなく、「心のゆとり」「家族との時間」「栄養への安心感」を強調する

【禁止事項】
- 「〜すべき」「〜しなければならない」といった強制的・威圧的な表現
- 難解な専門用語や、堅苦しすぎるビジネス敬語

【レッスン情報】
- お品書き: ${menu}
- 日時: ${datetime}
- 時間: ${duration}分
- 料金: ${price}円（税込）
- 講師: ${instructor}
- 予約URL: ${reservaUrl}

【出力形式】
LINE用のテキストのみを出力してください。余計な説明や前置きは不要です。
`;

// メール告知文生成プロンプト
const getEmailPrompt = (
  menu: string,
  datetime: string,
  duration: string,
  price: string,
  instructor: string,
  reservaUrl: string
) => `
あなたは料理教室の告知メールを作成するアシスタントです。
以下の情報をもとに、メールの件名と本文を作成してください。

【トーン】
- 温かい、親しみやすい、ポジティブ、安心感がある
- 完璧を求める「厳しい先生」ではなく、一緒に頑張る「共感者・サポーター」
- です・ます調

【執筆ガイドライン】
- 共感から入る表現を入れる
- 参加の心理的ハードルを下げるキーワードを意識する
- ベネフィットの提示

【レッスン情報】
- お品書き: ${menu}
- 日時: ${datetime}
- 時間: ${duration}分
- 料金: ${price}円（税込）
- 講師: ${instructor}
- 予約URL: ${reservaUrl}

【出力形式】
以下のJSON形式で出力してください。余計な説明は不要です。
{"subject": "件名", "body": "本文"}
`;

// LP HTML生成プロンプト（プロフェッショナル品質）
const getHtmlPrompt = (
  menu: string,
  datetime: string,
  duration: string,
  price: string,
  instructor: string,
  reservaUrl: string
) => `
あなたはプロのWebデザイナーとして、料理教室のLP（ランディングページ）を作成します。
コンバージョン率を最大化する、美しくモダンなHTMLを生成してください。

【ブランドコンセプト】
「忙しい毎日でも、料理を通じて心にゆとりを」
ターゲット: 30-50代女性、共働き、料理初心者〜中級者

【カラーパレット（CSS変数で定義）】
--primary: #FF6B6B（コーラルピンク - メインカラー）
--primary-light: #FFE5E5（淡いピンク）
--primary-dark: #E55555（濃いピンク - ホバー時）
--accent: #4CAF50（グリーン - CTAボタン）
--accent-hover: #388E3C（CTAホバー）
--warm-white: #FFFAF5（背景）
--cream: #FFF8F0（セクション背景交互）
--text-primary: #333333（メインテキスト）
--text-secondary: #666666（サブテキスト）
--text-light: #999999（補足テキスト）

【タイポグラフィ】
- 見出し: font-weight: 700, letter-spacing: 0.05em
- 本文: font-weight: 400, line-height: 1.8
- Google Fonts: "Noto Sans JP" を使用

【デザインテクニック】
1. box-shadow: 0 4px 20px rgba(0,0,0,0.08) で浮遊感
2. border-radius: 16px〜24px で柔らかさ
3. グラデーション: linear-gradient(135deg, ...)
4. 背景に薄い幾何学模様やドット柄
5. セクション間に波形のSVGセパレーター
6. CTAボタンにホバーアニメーション（transform, box-shadow）
7. スクロールで要素がフェードイン（animation）

【ページ構成（1ページ完結）】

■ ヒーローセクション
- フルワイド、min-height: 80vh
- 背景: コーラルピンクグラデーション + 薄い料理アイコンパターン
- 大きなキャッチコピー（menu名を魅力的に表現）
- サブコピー（ベネフィット訴求）
- CTAボタン（「今すぐ予約する」）

■ 問題提起セクション（共感パート）
- 「こんなお悩みありませんか？」
- チェックリスト形式で3-4個の悩み
- 例: 「毎日の献立を考えるのが大変」「料理のレパートリーを増やしたい」

■ 解決策セクション
- このレッスンで得られること
- アイコン付きの3つのポイント
- 視覚的にわかりやすいカード形式

■ レッスン詳細セクション
- 見やすいテーブルまたはカード形式
- 日時、所要時間、料金、講師名
- お品書き（魅力的に記載）
- 料金は大きく、「税込」を明記

■ 講師紹介セクション
- 講師名と短い紹介文
- 親しみやすい雰囲気を演出

■ よくある質問（FAQ）
- 「料理初心者でも大丈夫？」→「はい、丁寧にサポートします」
- 「材料は自分で用意？」→「レシピと材料リストをお送りします」
- アコーディオン風デザイン

■ CTAセクション（予約ボタン）
- 背景色を変えて目立たせる
- 大きなボタン + 「残り枠わずか！」等の緊急性
- 予約URL: ${reservaUrl}

■ 注意事項セクション
- 予約締切、キャンセルポリシー
- 小さめの文字、アコーディオン可

■ フッター
- シンプル、コピーライト

【レッスン情報】
- お品書き: ${menu}
- 日時: ${datetime}
- 時間: ${duration}分
- 料金: ${price}円（税込）
- 講師: ${instructor}
- 予約URL: ${reservaUrl}

【予約注意事項】
${RESERVATION_NOTICE}

【キャンセルポリシー】
${CANCELLATION_POLICY}

【技術要件】
- HTML5セマンティックタグ使用（header, main, section, footer）
- CSS Grid / Flexboxで柔軟なレイアウト
- モバイルファースト、レスポンシブ（max-width: 600px, 900px）
- スムーススクロール（scroll-behavior: smooth）
- ボタンにtransition: all 0.3s ease
- SVG波形セパレーターを少なくとも1箇所使用
- Google Fonts CDNからNoto Sans JPを読み込む

【禁止事項】
- 画像ファイルへの参照（img src）は使用しない
- 外部CSSファイルへの参照は使用しない
- JavaScriptは最小限（スムーススクロール程度）

【出力形式】
完全で実行可能なHTMLファイル（<!DOCTYPE html>から</html>まで）を出力。
CSSは<style>タグ内に全て記述。プロダクションレベルの品質を維持。
コードのみ出力。説明文や前置きは一切不要。
`;

// コンテンツ生成 API（LINE、メール、HTML全て生成）
export const generate = onRequest(async (req, res) => {
  // CORS対応
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const {
      menu, datetime, duration, price, instructor, reservaUrl, type,
    } = req.body;

    const model = vertexAI.getGenerativeModel({model: "gemini-2.0-flash"});

    // typeパラメータで生成するコンテンツを選択（デフォルトは全て）
    const generateLine = !type || type === "all" || type === "line";
    const generateEmail = !type || type === "all" || type === "email";
    const generateHtml = !type || type === "all" || type === "html";

    const results: {
      lineText?: string;
      emailSubject?: string;
      emailBody?: string;
      html?: string;
    } = {};

    // LINE告知文生成
    if (generateLine) {
      const linePrompt = getLinePrompt(
        menu, datetime, duration, price, instructor, reservaUrl
      );
      const lineResult = await model.generateContent(linePrompt);
      const lineParts = lineResult.response.candidates?.[0]?.content?.parts;
      results.lineText = lineParts?.[0]?.text || "";
    }

    // メール告知文生成
    if (generateEmail) {
      const emailPrompt = getEmailPrompt(
        menu, datetime, duration, price, instructor, reservaUrl
      );
      const emailResult = await model.generateContent(emailPrompt);
      const emailParts = emailResult.response.candidates?.[0]?.content?.parts;
      const emailJson = emailParts?.[0]?.text || "{}";
      try {
        // JSONパース試行（マークダウンコードブロックを除去）
        const cleanJson = emailJson
          .replace(/```json\n?/g, "")
          .replace(/```\n?/g, "")
          .trim();
        const parsed = JSON.parse(cleanJson);
        results.emailSubject = parsed.subject || "";
        results.emailBody = parsed.body || "";
      } catch {
        results.emailSubject = "";
        results.emailBody = emailJson;
      }
    }

    // LP HTML生成
    if (generateHtml) {
      const htmlPrompt = getHtmlPrompt(
        menu, datetime, duration, price, instructor, reservaUrl
      );
      const htmlResult = await model.generateContent(htmlPrompt);
      const htmlParts = htmlResult.response.candidates?.[0]?.content?.parts;
      let html = htmlParts?.[0]?.text || "";
      // マークダウンコードブロックを除去
      html = html
        .replace(/```html\n?/g, "")
        .replace(/```\n?/g, "")
        .trim();
      results.html = html;
    }

    res.json(results);
  } catch (error) {
    console.error(error);
    res.status(500).json({error: "生成に失敗しました"});
  }
});

// LINE送信 API
export const lineSend = onRequest(
  {secrets: ["LINE_CHANNEL_ACCESS_TOKEN"]},
  async (req, res) => {
    // CORS対応
    res.set("Access-Control-Allow-Origin", "*");
    if (req.method === "OPTIONS") {
      res.set("Access-Control-Allow-Methods", "POST");
      res.set("Access-Control-Allow-Headers", "Content-Type");
      res.status(204).send("");
      return;
    }

    try {
      const {message} = req.body;

      // LINE_CHANNEL_ACCESS_TOKEN は Firebase の環境変数に設定
      const token = process.env.LINE_CHANNEL_ACCESS_TOKEN;

      const response = await fetch("https://api.line.me/v2/bot/message/broadcast", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({
          messages: [{type: "text", text: message}],
        }),
      });

      if (!response.ok) {
        throw new Error(`LINE API error: ${response.status}`);
      }

      res.json({success: true});
    } catch (error) {
      console.error(error);
      res.status(500).json({error: "LINE送信に失敗しました"});
    }
  });

// HTML公開 API（Cloud Storage に保存）
export const publishLesson = onRequest(async (req, res) => {
  // CORS対応
  res.set("Access-Control-Allow-Origin", "*");
  if (req.method === "OPTIONS") {
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type");
    res.status(204).send("");
    return;
  }

  try {
    const {html, date} = req.body;

    // バリデーション
    if (!html || !date) {
      res.status(400).json({
        error: "HTMLと日付が必要です",
      });
      return;
    }

    // 日付フォーマットの検証（YYYY-MM-DD）
    const datePattern = /^\d{4}-\d{2}-\d{2}$/;
    if (!datePattern.test(date)) {
      res.status(400).json({
        error: "日付は YYYY-MM-DD 形式で指定してください",
      });
      return;
    }

    // ファイル名生成（例: lesson-2025-02-02.html）
    const fileName = `lesson-${date}.html`;
    const filePath = `lessons/${fileName}`;

    // Cloud Storage にアップロード
    const bucket = getStorage().bucket();
    const file = bucket.file(filePath);

    await file.save(html, {
      contentType: "text/html; charset=utf-8",
      metadata: {
        cacheControl: "public, max-age=3600",
        contentDisposition: "inline",
      },
    });

    // ファイルを公開設定
    await file.makePublic();

    // 公開URL
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${filePath}`;

    res.json({
      success: true,
      url: publicUrl,
      fileName: fileName,
      filePath: filePath,
    });
  } catch (error) {
    console.error("Publish error:", error);
    res.status(500).json({
      error: "公開に失敗しました",
      details: error instanceof Error ? error.message : String(error),
    });
  }
});
