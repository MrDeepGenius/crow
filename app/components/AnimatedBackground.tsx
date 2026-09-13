"use client";

const threads = [
  { left: "8%", delay: "0s", duration: "9s", color: "rgba(139,92,246,0.7)" },
  { left: "22%", delay: "2.5s", duration: "11s", color: "rgba(168,85,247,0.55)" },
  { left: "38%", delay: "1s", duration: "8s", color: "rgba(232,121,249,0.45)" },
  { left: "55%", delay: "3.5s", duration: "12s", color: "rgba(139,92,246,0.6)" },
  { left: "70%", delay: "1.5s", duration: "10s", color: "rgba(192,132,252,0.5)" },
  { left: "85%", delay: "4s", duration: "13s", color: "rgba(168,85,247,0.45)" },
  { left: "94%", delay: "0.5s", duration: "9.5s", color: "rgba(232,121,249,0.4)" },
];

const sparkles = Array.from({ length: 24 }, (_, i) => ({
  left: `${(i * 37) % 100}%`,
  top: `${(i * 53) % 100}%`,
  delay: `${(i % 7) * 0.8}s`,
  duration: `${3 + (i % 5)}s`,
  size: `${2 + (i % 3)}px`,
}));

export default function AnimatedBackground() {
  return (
    <div className="bg-layer">
      {threads.map((t, i) => (
        <div
          key={`th-${i}`}
          className="thread"
          style={{
            left: t.left,
            animationDelay: t.delay,
            animationDuration: t.duration,
            background: `linear-gradient(to bottom, transparent, ${t.color}, transparent)`,
          }}
        />
      ))}
      {sparkles.map((s, i) => (
        <div
          key={`sp-${i}`}
          className="sparkle"
          style={{
            left: s.left,
            top: s.top,
            width: s.size,
            height: s.size,
            animationDelay: s.delay,
            animationDuration: s.duration,
          }}
        />
      ))}
      <div className="aurora aurora-1" />
      <div className="aurora aurora-2" />
      <div className="aurora aurora-3" />
      <style jsx>{`
        .bg-layer {
          position: absolute;
          inset: 0;
          overflow: hidden;
          pointer-events: none;
          z-index: 0;
        }
        .thread {
          position: absolute;
          top: -60%;
          width: 2px;
          height: 55%;
          border-radius: 50%;
          filter: blur(0.5px);
          animation-name: thread-fall;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes thread-fall {
          0% {
            transform: translateY(-120%) scaleY(0.8);
            opacity: 0;
          }
          15% {
            opacity: 1;
          }
          85% {
            opacity: 1;
          }
          100% {
            transform: translateY(320%) scaleY(1.1);
            opacity: 0;
          }
        }
        .sparkle {
          position: absolute;
          border-radius: 50%;
          background: #fff;
          box-shadow: 0 0 6px rgba(192, 132, 252, 0.9),
            0 0 14px rgba(139, 92, 246, 0.6);
          animation-name: twinkle;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        @keyframes twinkle {
          0%,
          100% {
            opacity: 0;
            transform: scale(0.4);
          }
          50% {
            opacity: 1;
            transform: scale(1.3);
          }
        }
        .aurora {
          position: absolute;
          border-radius: 50%;
          filter: blur(90px);
          opacity: 0.3;
          animation-name: aurora-drift;
          animation-timing-function: ease-in-out;
          animation-iteration-count: infinite;
        }
        .aurora-1 {
          width: 520px;
          height: 520px;
          background: radial-gradient(
            circle,
            rgba(124, 58, 237, 0.5),
            transparent 70%
          );
          top: -12%;
          left: 3%;
          animation-duration: 16s;
        }
        .aurora-2 {
          width: 420px;
          height: 420px;
          background: radial-gradient(
            circle,
            rgba(232, 121, 249, 0.4),
            transparent 70%
          );
          bottom: -8%;
          right: 4%;
          animation-duration: 20s;
          animation-delay: 3s;
        }
        .aurora-3 {
          width: 360px;
          height: 360px;
          background: radial-gradient(
            circle,
            rgba(99, 102, 241, 0.35),
            transparent 70%
          );
          top: 35%;
          left: 45%;
          animation-duration: 24s;
          animation-delay: 6s;
        }
        @keyframes aurora-drift {
          0%,
          100% {
            transform: translate(0, 0) scale(1);
          }
          50% {
            transform: translate(50px, -35px) scale(1.18);
          }
        }
      `}</style>
    </div>
  );
}
