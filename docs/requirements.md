# 要件定義・仕様レビューたたき台

## Supabase を採用した理由
- WordPress投稿時のプロキシ機能が必要だった。
- 無料枠で検証しやすい。

## MVP 機能（実装対象）
- 認証: メール/パスワードログイン、RLSで他ユーザーのデータ不可視。
- 記事生成: キーワード入力→タイトル生成→本文生成→履歴保存（Supabase）。
- 履歴: ダッシュボードで一覧表示・再閲覧・WP投稿。
- WP連携: 接続テスト、WP投稿（下書き/公開）、連携設定の保存（user_id紐づけ）。
- 画像: アイキャッチ/H2画像生成。

## 非機能要件
- セキュリティ: RLS有効化、articles/wp_credentials にポリシー設定。秘密情報は環境変数で管理（`VITE_*`, Supabase Secrets）。
- デプロイ: Vercel + Supabase。Edge Function（wp-proxy）デプロイ済み、環境変数を本番環境に設定。

## 進め方（レビュー手順）
1) 本ドキュメントでMVP機能と非機能を合意。
2) DB/RLS確認（articles, wp_credentials のテーブルとポリシー、索引）。
3) 環境変数・Secrets確認（Vercel: `VITE_*`、Supabase: `WORDPRESS_*`, `WP_PROXY_KEY`）。
4) 簡易テスト: ログイン→履歴取得→WP接続テスト→WP投稿（下書き/公開）まで通るか。

