# 🌿 ブランチ操作ガイド

Gitのブランチ切り替え・作成の基本コマンドをまとめたものです。
セットアップ手順は [beginner-read.md](beginner-read.md)、コードの仕組みは [ARCHITECTURE.md](ARCHITECTURE.md) を参照してください。

---

## 1. 今どのブランチにいるか確認する

```bash
git branch
```

`*`が付いているものが現在のブランチです。

---

## 2. 既存のブランチに切り替える

```bash
git checkout main
```

またはNode.jsではなくGitの比較的新しいコマンドでも同じことができます。

```bash
git switch main
```

⚠️ **注意**: 未コミットの変更がある状態では切り替えられないことがあります。
その場合は次のどちらかを行ってください。

- 変更をコミットしてから切り替える
- `git stash`で変更を一時退避してから切り替える（下記4参照）

---

## 3. 新しいブランチを作って切り替える

```bash
git checkout -b feature/新しい機能名
```

`-b`は「ブランチを新規作成して、そのままそこに切り替える」という意味です。
[AGENTS.md](AGENTS.md)のルールにより、`develop`から`feature/<機能名>`を切るのが基本方針です。

---

## 4. 変更を一時退避する（stash）

作業途中の変更を残したまま別のブランチに移りたいときに使います。

```bash
git stash          # 今の変更を退避する
git checkout main  # 別のブランチに移動
# ...何か作業する...
git checkout feature/元のブランチ名
git stash pop      # 退避した変更を元に戻す
```

---

## 5. ブランチ一覧を見る

```bash
git branch      # ローカルのブランチだけ
git branch -a   # リモート（origin）も含めて全部表示
```

---

## 6. 作業を終えたブランチをPRに出す流れ

```bash
git add <ファイル名>
git commit -m "feat: 〇〇を追加"
git push -u origin feature/新しい機能名
```

push後、GitHub上で`main`（または`develop`）向けのプルリクエストを作成します。

⚠️ [AGENTS.md](AGENTS.md)のルールにより、`main`への直接pushは禁止です。必ずブランチを切ってPR経由でマージしてください。

---

## よくある操作の早見表

| やりたいこと | コマンド |
|---|---|
| 今のブランチを確認 | `git branch` |
| 既存ブランチに移動 | `git checkout <ブランチ名>` |
| 新規ブランチを作って移動 | `git checkout -b <新ブランチ名>` |
| 変更を退避する | `git stash` |
| 退避した変更を戻す | `git stash pop` |
| リモートも含め一覧表示 | `git branch -a` |
| 変更をpushする | `git push -u origin <ブランチ名>` |
