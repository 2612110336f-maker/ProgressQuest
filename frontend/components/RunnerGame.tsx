// --- AI待機中に遊べるミニゲーム(Chrome恐竜ゲーム風のランナー) ---
// QuestLoading.tsxから表示される「暇つぶし」要素。
// ゲームの物理演算(重力・当たり判定)は毎フレームrequestAnimationFrameで回すため、
// Reactのstate更新(再レンダリング)を待たずに済むよう、実際の計算はuseRefの値で行い、
// 画面表示用にだけ都度setState()している(state更新のたびに再登録されるクロージャ問題を避けるため)。
"use client";
import { useEffect, useRef, useState } from "react";

const GAME_WIDTH = 280;
const GAME_HEIGHT = 90;
const PLAYER_X = 16;
const SIZE = 24;
const GROUND_Y = GAME_HEIGHT - SIZE - 4;
const GRAVITY = 1500;
const JUMP_VELOCITY = -420;
const INITIAL_SPEED = 130;

type Obstacle = { id: number; x: number };

export default function RunnerGame() {
  const [playerY, setPlayerY] = useState(GROUND_Y);
  const [obstacles, setObstacles] = useState<Obstacle[]>([]);
  const [score, setScore] = useState(0);
  const [gameOver, setGameOver] = useState(false);
  const [started, setStarted] = useState(false);

  const startedRef = useRef(false);
  const gameOverRef = useRef(false);
  const playerYRef = useRef(GROUND_Y);
  const velocityRef = useRef(0);
  const obstaclesRef = useRef<Obstacle[]>([]);
  const speedRef = useRef(INITIAL_SPEED);
  const scoreRef = useRef(0);
  const spawnTimerRef = useRef(0);
  const nextIdRef = useRef(0);
  const lastTimeRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  // ゲームオーバー中はタップ/スペースでリスタート、未開始ならゲーム開始、
  // 地面にいるとき(GROUND_Y付近)だけジャンプの初速を与える(空中での連続ジャンプを防ぐ)
  const jump = () => {
    if (gameOverRef.current) {
      restart();
      return;
    }
    if (!startedRef.current) {
      startedRef.current = true;
      setStarted(true);
    }
    if (playerYRef.current >= GROUND_Y - 1) {
      velocityRef.current = JUMP_VELOCITY;
    }
  };

  const restart = () => {
    playerYRef.current = GROUND_Y;
    velocityRef.current = 0;
    obstaclesRef.current = [];
    speedRef.current = INITIAL_SPEED;
    scoreRef.current = 0;
    spawnTimerRef.current = 0;
    gameOverRef.current = false;
    startedRef.current = true;
    setPlayerY(GROUND_Y);
    setObstacles([]);
    setScore(0);
    setGameOver(false);
    setStarted(true);
  };

  // メインゲームループ。マウント時に1回だけrequestAnimationFrameを開始し、
  // 前フレームとの経過時間(dt)を使ってフレームレートに依存しない物理演算を行う。
  useEffect(() => {
    const loop = (time: number) => {
      if (lastTimeRef.current === null) lastTimeRef.current = time;
      // dtの上限を0.05秒に抑え、タブが非アクティブ復帰時などの巨大なdtによる
      // 位置ワープ(壁抜け・当たり判定すり抜け)を防ぐ
      const dt = Math.min(0.05, (time - lastTimeRef.current) / 1000);
      lastTimeRef.current = time;

      if (startedRef.current && !gameOverRef.current) {
        // 重力で速度を増やし、その速度でプレイヤーのY座標を更新(地面より下には行かない)
        velocityRef.current += GRAVITY * dt;
        playerYRef.current = Math.min(GROUND_Y, playerYRef.current + velocityRef.current * dt);

        // 時間経過とともにスクロール速度と障害物の出現間隔を厳しくして難易度を上げる
        speedRef.current += dt * 4;
        spawnTimerRef.current += dt;
        const spawnInterval = Math.max(0.9, 1.6 - scoreRef.current * 0.002);
        if (spawnTimerRef.current > spawnInterval) {
          spawnTimerRef.current = 0;
          obstaclesRef.current = [
            ...obstaclesRef.current,
            { id: nextIdRef.current++, x: GAME_WIDTH },
          ];
        }
        // 障害物を左に流し、画面外に出たものは配列から除去する
        obstaclesRef.current = obstaclesRef.current
          .map((o) => ({ ...o, x: o.x - speedRef.current * dt }))
          .filter((o) => o.x > -SIZE);

        // 単純な矩形の重なり判定(AABB)。X軸で重なり、かつプレイヤーが地面付近(ジャンプで
        // 十分高く飛べていない)ならゲームオーバーにする
        for (const o of obstaclesRef.current) {
          const overlapX = o.x < PLAYER_X + SIZE && o.x + SIZE > PLAYER_X;
          const tooLow = playerYRef.current > GROUND_Y - 10;
          if (overlapX && tooLow) {
            gameOverRef.current = true;
            setGameOver(true);
          }
        }

        scoreRef.current += dt * 10;
        setScore(Math.floor(scoreRef.current));
        setPlayerY(playerYRef.current);
        setObstacles(obstaclesRef.current);
      }

      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, []);

  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.code === "Space" || e.key === " ") {
        e.preventDefault();
        jump();
      }
    };
    window.addEventListener("keydown", handleKey);
    return () => window.removeEventListener("keydown", handleKey);
  }, []);

  return (
    <div className="select-none">
      <div
        className="relative bg-[#EEF5EE] rounded-xl overflow-hidden mx-auto shadow-neumorphism-inset cursor-pointer"
        style={{ width: GAME_WIDTH, height: GAME_HEIGHT }}
        onClick={jump}
        onTouchStart={(e) => {
          e.preventDefault();
          jump();
        }}
      >
        <div
          className="absolute text-2xl leading-none"
          style={{ left: PLAYER_X, top: playerY, width: SIZE, height: SIZE }}
        >
          ⚔️
        </div>
        {obstacles.map((o) => (
          <div
            key={o.id}
            className="absolute text-xl leading-none"
            style={{ left: o.x, top: GROUND_Y, width: SIZE, height: SIZE }}
          >
            🌲
          </div>
        ))}
        <div
          className="absolute left-0 right-0 bg-[#2D6A4F]/20"
          style={{ top: GROUND_Y + SIZE }}
        />

        {!started && !gameOver && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/5 text-xs text-[#2D6A4F] font-bold px-4 text-center">
            タップ / スペースキーでジャンプ！
          </div>
        )}
        {gameOver && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/10 text-xs text-[#2D6A4F] font-bold gap-1">
            <p>ゲームオーバー！スコア: {score}</p>
            <p>タップでもう一度</p>
          </div>
        )}
      </div>
      {started && !gameOver && (
        <p className="text-center text-xs text-[#888888] mt-1">スコア: {score}</p>
      )}
    </div>
  );
}
