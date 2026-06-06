"use client";

import { useEffect, type CSSProperties, type ReactNode } from "react";
import Image from "next/image";

const ASSET = "/images/landing";

export function LandingPage() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".landing-page");
    if (!root) return;
    const landingRoot = root;

    const reduceMotion =
      window.matchMedia?.("(prefers-reduced-motion: reduce)").matches ?? false;
    let revealEls = Array.from(
      root.querySelectorAll<HTMLElement>(".reveal, .reveal-scale"),
    );

    if (reduceMotion) {
      revealEls.forEach((el) => el.classList.add("in"));
      revealEls = [];
    }

    function checkReveals() {
      if (!revealEls.length) return;
      const vh = window.innerHeight;
      for (let i = revealEls.length - 1; i >= 0; i -= 1) {
        const el = revealEls[i];
        const rect = el.getBoundingClientRect();
        if (rect.top < vh * 0.88 && rect.bottom > 0) {
          el.classList.add("in");
          revealEls.splice(i, 1);
        }
      }
    }

    const nav = root.querySelector<HTMLElement>(".nav");
    function updateNav() {
      if (!nav) return;
      nav.classList.toggle("scrolled", landingRoot.scrollTop > 12);
    }

    const heroVisual = root.querySelector<HTMLElement>(".hero-visual");
    const floatChips = Array.from(
      root.querySelectorAll<HTMLElement>(".float-chip"),
    );
    const toolChips = Array.from(
      root.querySelectorAll<HTMLElement>(".tool-chip"),
    );
    const scatterLayout = [
      { x: 4, y: 6, s: 0.12 },
      { x: 62, y: 0, s: 0.2 },
      { x: 30, y: 60, s: 0.08 },
      { x: 78, y: 54, s: 0.16 },
      { x: 0, y: 70, s: 0.24 },
      { x: 50, y: 28, s: 0.1 },
    ];
    toolChips.forEach((chip, index) => {
      const layout = scatterLayout[index % scatterLayout.length];
      chip.style.left = `${layout.x}%`;
      chip.style.top = `${layout.y}%`;
      chip.dataset.speed = String(layout.s);
    });

    const pinWrap = root.querySelector<HTMLElement>(".pin-wrap");
    const steps = Array.from(root.querySelectorAll<HTMLElement>(".step"));
    const reportFrame = root.querySelector<HTMLElement>(".report-frame");
    const reportShots = Array.from(
      root.querySelectorAll<HTMLElement>(".report-shot"),
    );
    const ring = root.querySelector<HTMLElement>(".report-prog .ring");
    const progLabel = root.querySelector<HTMLElement>(".report-prog .lbl");

    function updatePin() {
      if (!pinWrap) return;
      const vh = landingRoot.clientHeight || window.innerHeight;
      const total = pinWrap.offsetHeight - vh;
      const rootRect = landingRoot.getBoundingClientRect();
      const pinRect = pinWrap.getBoundingClientRect();
      const pinStart = pinRect.top - rootRect.top + landingRoot.scrollTop;
      const scrolled = Math.min(
        Math.max(landingRoot.scrollTop - pinStart, 0),
        total,
      );
      const progress = total > 0 ? scrolled / total : 0;
      const count = steps.length;
      let activeCount = Math.min(
        count,
        Math.floor(progress * (count + 0.4)) + 1,
      );
      if (progress <= 0.001) activeCount = 1;

      steps.forEach((step, index) => {
        step.classList.toggle("active", index < activeCount);
      });

      const pct = Math.round((activeCount / count) * 100);
      ring?.style.setProperty("--p", `${pct}%`);
      if (progLabel) progLabel.textContent = `${pct}%`;
      reportShots.forEach((shot, index) => {
        shot.classList.toggle("is-on", index + 1 === activeCount);
      });

      if (reportFrame && !reduceMotion) {
        const scale = 0.965 + (Math.min(progress, 0.2) / 0.2) * 0.035;
        reportFrame.style.transform = `scale(${scale.toFixed(3)})`;
      }
    }

    let ticking = false;
    function onScroll() {
      if (ticking) return;
      ticking = true;
      window.requestAnimationFrame(() => {
        updateNav();
        const y = landingRoot.scrollTop;

        if (!reduceMotion) {
          if (heroVisual) {
            heroVisual.style.transform = `translateY(${(y * -0.06).toFixed(1)}px)`;
          }
          floatChips.forEach((chip, index) => {
            const speed = (index + 1) * 0.04;
            chip.style.transform = `translateY(${(y * speed).toFixed(1)}px)`;
          });
          toolChips.forEach((chip) => {
            const speed = Number.parseFloat(chip.dataset.speed ?? "0.1");
            const rect = chip.getBoundingClientRect();
            const offset = (window.innerHeight / 2 - rect.top) * speed;
            chip.style.transform = `translateY(${offset.toFixed(1)}px)`;
          });
        }

        checkReveals();
        updatePin();
        ticking = false;
      });
    }

    const year = root.querySelector<HTMLElement>("#yr");
    if (year) year.textContent = String(new Date().getFullYear());

    updatePin();
    onScroll();
    landingRoot.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);

    if (!reduceMotion) {
      window.requestAnimationFrame(() => {
        document.documentElement.classList.add("anim");
        checkReveals();
      });
      window.setTimeout(() => {
        const probe = root.querySelector<HTMLElement>(
          ".reveal.in, .reveal-scale.in",
        );
        if (probe && Number.parseFloat(getComputedStyle(probe).opacity) < 0.05) {
          document.documentElement.classList.remove("anim");
          root
            .querySelectorAll<HTMLElement>(".reveal, .reveal-scale")
            .forEach((el) => el.classList.add("in"));
        }
      }, 700);
    }

    return () => {
      landingRoot.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
      document.documentElement.classList.remove("anim");
    };
  }, []);

  return (
    <div className="landing-page h-screen overflow-y-auto overflow-x-hidden bg-[#f5f7fb]">
      <header className="nav" id="nav">
        <div className="wrap">
          <a className="brand" href="#top" aria-label="Tplanner 홈">
            <Image className="brand-mark" src={`${ASSET}/logo.png`} alt="Tplanner" width={1675} height={1675} />
            <span className="brand-name">Tplanner</span>
          </a>
          <nav className="nav-links">
            <a className="nav-link" href="#calendar">캘린더</a>
            <a className="nav-link" href="#students">학생 관리</a>
            <a className="nav-link" href="#homework">숙제</a>
            <a className="nav-link" href="#report">학부모 리포트</a>
          </nav>
          <div className="nav-right">
            <a className="nav-link" href="/login">로그인</a>
            {/* <a className="btn btn-primary btn-md" href="/login">무료로 시작하기</a> */}
          </div>
        </div>
      </header>

      <main id="top">
        <section className="hero">
          <div className="wrap">
            <div className="hero-copy">
              <h1 className="reveal">
                수업 관리부터<br />
                <span className="accent">학부모 리포트</span>까지,
                <br />
                한 곳에서.
              </h1>
              <p className="lead reveal" style={{ "--d": ".08s" } as CSSProperties}>
                과외 선생님을 위한 올인원 관리 도구.
                <br />
                불편했던 수업 관리를 Tplanner 하나로 정리하세요.
              </p>
              <div className="hero-cta reveal" style={{ "--d": ".16s" } as CSSProperties}>
                <a className="btn btn-primary btn-lg" href="/login">
                  무료로 시작하기
                  <ArrowIcon />
                </a>
              </div>
              <p className="hero-note reveal" style={{ "--d": ".24s" } as CSSProperties}>
                <CheckIcon />
                <span><b>수업이 많아져도</b> 한눈에 관리하세요.</span>
              </p>
            </div>

            <div className="hero-visual reveal-scale" style={{ "--d": ".12s" } as CSSProperties}>
              <div className="float-chip fc-1"><span className="dot" style={{ background: "#34d399" }} />김민지 · 물리II</div>
              <div className="float-chip fc-2"><span className="dot" style={{ background: "#fbbf24" }} />이윤재 · 미적분</div>
              <div className="float-chip fc-3"><span className="dot" style={{ background: "#0ea5e9" }} />리포트 전송 완료</div>
              <BrowserFrame elevated url="tplanner.co.kr" lock>
                <Image className="shot-img" src={`${ASSET}/hero-calendar.png`} alt="쌤플래너 주간 캘린더 화면" width={3444} height={1920} priority style={{ aspectRatio: "3444/1920" }} />
              </BrowserFrame>
            </div>
          </div>
        </section>

        <section className="section-pad problem">
          <div className="wrap">
            <div className="scatter reveal" aria-hidden="true">
              {["카카오톡", "엑셀", "구글 캘린더", "애플 캘린더", "노션", "메모장"].map((tool) => (
                <span key={tool} className="tool-chip">{tool}</span>
              ))}
            </div>
            <h2 className="reveal" style={{ "--d": ".06s" } as CSSProperties}>
              아직도 이 사이를<br />오가며 관리하시나요?
            </h2>
            <p className="sub reveal" style={{ "--d": ".12s" } as CSSProperties}>
              <b>수업 일정</b>은 캘린더에, <b>숙제</b>는 메모장에,
              <br />
              <b>학부모 상담</b>은 카톡에, <b>보고서</b>는 또 엑셀에.
            </p>
            <p className="resolve reveal" style={{ "--d": ".18s" } as CSSProperties}>이제, 모두 한 곳에서.</p>
          </div>
        </section>

        <section className="section-pad founder">
          <div className="wrap">
            <div className="founder-head reveal">
              <span className="eyebrow">왜 만들었나</span>
              <h2>5년간 과외하며,<br />정말 많은 방법으로 관리해봤습니다.</h2>
            </div>
            <div className="tried reveal" style={{ "--d": ".08s" } as CSSProperties}>
              {["메모장", "엑셀 시트", "구글 캘린더", "애플 캘린더", "노션", "카카오톡"].map((tool) => (
                <span key={tool} className="tried-chip struck">{tool}</span>
              ))}
            </div>
            <div className="founder-body reveal" style={{ "--d": ".14s" } as CSSProperties}>
              <p>수업이 늘어날수록 관리는 더 복잡해졌습니다. 일정은 캘린더에, 숙제는 메모에, 학부모에게 보낼 내용은 또 따로 정리해야 했습니다.<br />매번 여러 앱을 오가다 보면 정작 <b>수업 준비에 쓸 시간</b>이 사라졌습니다.</p>
              <p>“선생님에게 꼭 맞는 관리 도구는 왜 없을까?” 그런 답답함에서 시작해, <br /><b>직접 만들게 된 서비스</b>가 바로 Tplanner입니다.</p>
            </div>
            {/* <div className="sign reveal" style={{ "--d": ".2s" } as CSSProperties}>
              <Image className="av" src={`${ASSET}/founder.jpg`} alt="Tplanner를 만든 사람" width={600} height={600} />
              <span><b>Tplanner를 만든 사람</b> · 5년 차 과외 선생님</span>
            </div> */}
          </div>
        </section>

        <FeatureSection
          id="calendar"
          eyebrow="캘린더"
          title={<>수업 일정을<br />한눈에 관리하세요</>}
          lead="이번 주 모든 수업을 한 화면에서. 일정이 겹치는지, 비는 시간은 언제인지 바로 보입니다."
          image="feat-calendar.png"
          alt="주간 캘린더 · 세션 상세"
          url="tplanner.co.kr/calendar"
          points={[
            ["calendar", "드래그 앤 드롭으로 일정 변경", "수업 시간이 바뀌어도, 끌어서 옮기면 끝."],
            ["copy", "복사·붙여넣기로 반복 수업 생성", "매주 같은 수업, 한 번 만들고 복붙하세요."],
            ["clock", "일·주·월 단위로 자유롭게", "오늘 하루부터 이번 달 전체까지."],
          ]}
        />

        <FeatureSection
          id="students"
          reverse
          eyebrow="학생 관리"
          title={<>학생 정보를<br />깔끔하게 정리하세요</>}
          lead="학생이 늘어도 헷갈리지 않게. 한 명 한 명의 정보를 한 곳에 모아둡니다."
          image="feat-students.png"
          alt="학생 목록 · 학생 상세"
          url="tplanner.co.kr/students"
          points={[
            ["school", "학교 · 학년별 정리", "어느 학교 몇 학년인지 바로 확인."],
            ["book", "수강 과목 기록", "수학·영어·국어, 학생별로 다른 과목까지."],
            ["user", "학생별 색상으로 구분", "캘린더·기록·리포트까지 같은 색으로."],
          ]}
        />

        <FeatureSection
          id="homework"
          eyebrow="숙제 관리"
          title={<>숙제를<br />잊지 않게</>}
          lead="누가 무슨 숙제를 받았고, 다음 시간에 뭘 확인해야 하는지. 기억에 의존하지 마세요."
          image="feat-homework.png"
          alt="수업 기록 · 숙제 체크리스트"
          url="tplanner.co.kr/records"
          points={[
            ["checkList", "학생별 과제 기록", "이번 주 숙제를 학생 옆에 바로 남겨요."],
            ["checkBox", "제출 여부 체크", "했는지 안 했는지, 체크 한 번으로 기록."],
            ["history", "지난 숙제 이력 조회", "그동안 어떤 과제를 냈는지 한눈에."],
          ]}
        />

        <section id="report" className="pin-wrap">
          <div className="pin-stage">
            <div className="wrap">
              <div className="pin-copy">
                <span className="eyebrow">학부모 리포트 · Tplanner의 핵심</span>
                <h2>쌓인 수업 기록을<br />1분 만에 리포트로.</h2>
                <p className="lead">캘린더도, 학생 관리도 다른 도구로 할 수 있죠. 하지만 <b style={{ color: "var(--t-strong)" }}>수업 기록을 리포트로 정리하는 일</b>은 <br />Tplanner가 가장 잘합니다.</p>
                <div className="steps">
                  {[
                    ["1", "수업 내용 입력", "오늘 무엇을 했는지 기록"],
                    ["2", "숙제 기록", "다음 시간까지 할 과제"],
                    ["3", "다음 계획", "앞으로의 학습 방향"],
                    ["4", "학부모에게 전달", "정리된 리포트를 그대로 전송"],
                  ].map(([num, title, desc], index) => (
                    <div key={num} className={`step ${index === 0 ? "active" : ""}`}>
                      <span className="step-num">{num}</span>
                      <span className="step-tx">{title}<span>{desc}</span></span>
                    </div>
                  ))}
                </div>
              </div>

              <div className="report-stage">
                <div className="report-frame frame elevated">
                  <div className="report-prog">
                    <span className="ring" style={{ "--p": "25%" } as CSSProperties} />
                    <span className="lbl">25%</span>
                  </div>
                  <FrameBar url="tplanner.co.kr/reports" />
                  <div className="frame-body">
                    <div className="report-shots" style={{ aspectRatio: "3444/1920" }}>
                      {[
                        ["report-1.png", "수업 내용 입력"],
                        ["report-2.png", "숙제 기록"],
                        ["report-3.png", "리포트 구성"],
                        ["report-4.png", "학부모에게 전달"],
                      ].map(([image, alt], index) => (
                        <Image
                          key={image}
                          className={`report-shot ${index === 0 ? "is-on" : ""}`}
                          data-step={index + 1}
                          src={`${ASSET}/${image}`}
                          alt={alt}
                          width={3444}
                          height={image === "report-2.png" || image === "report-4.png" ? 1922 : 1920}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        <section className="section-pad why">
          <div className="wrap">
            <span className="eyebrow reveal" style={{ display: "inline-flex" }}>왜 Tplanner인가</span>
            <h2 className="reveal" style={{ "--d": ".06s" } as CSSProperties}>필요한 것만, 딱 네 가지.</h2>
            <p className="lead reveal" style={{ "--d": ".1s" } as CSSProperties}>기능을 늘리는 대신, 과외 선생님이 매일 쓰는 일을 가장 잘 해냅니다.</p>
            <div className="card-grid">
              {[
                ["calendar", "수업 일정 관리", "드래그로 옮기고, 복붙으로 반복 수업까지. 한 화면에서 끝."],
                ["user", "학생 정보 관리", "학교·학년·과목을 학생별로. 색상으로 한눈에 구분."],
                ["checkList", "숙제 기록", "과제와 제출 여부, 지난 이력까지. 기억에 의존하지 않아요."],
                ["report", "학부모 리포트", "수업 직후 1분 작성, 그대로 전달. Tplanner의 핵심."],
              ].map(([icon, title, desc], index) => (
                <div key={title} className="why-card reveal" style={{ "--d": `${0.04 + index * 0.06}s` } as CSSProperties}>
                  <span className="why-ic"><FeatureIcon name={icon} size={22} /></span>
                  <h3>{title}</h3>
                  <p>{desc}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="section-pad cta">
          <div className="wrap">
            <h2 className="reveal">수업 준비에 집중하세요.<br />관리는 Tplanner가 도와드립니다.</h2>
            <p className="lead reveal" style={{ "--d": ".08s" } as CSSProperties}>지금 바로, 무료로 시작할 수 있습니다.</p>
            <div className="cta-btn reveal" style={{ "--d": ".14s" } as CSSProperties}>
              <a className="btn btn-primary btn-lg" href="/login">
                시작하기
                <ArrowIcon />
              </a>
              <p className="cta-sub">결제 없이 · 1분이면 충분합니다</p>
            </div>
          </div>
        </section>
      </main>

      <footer className="footer">
        <div className="wrap">
          <div>
            <a className="brand" href="#top">
              <Image className="brand-mark" src={`${ASSET}/logo.png`} alt="Tplanner" width={1675} height={1675} />
              <span className="brand-name">Tplanner</span>
            </a>
            <p className="footer-copy">© <span id="yr">2026</span> Tplanner. 과외 선생님을 위한 올인원 관리 도구.</p>
          </div>
          <nav className="footer-links">
            <a href="mailto:leegihun8752@gmail.com">문의</a>
            <a href="/privacy">개인정보처리방침</a>
            <span
              aria-disabled="true"
              style={{
                color: "var(--t-disabled)",
                cursor: "default",
                fontSize: 14,
                fontWeight: 600,
                whiteSpace: "nowrap",
              }}
            >
              이용약관
            </span>
          </nav>
        </div>
      </footer>
    </div>
  );
}

function BrowserFrame({
  children,
  elevated = false,
  lock = false,
  url,
}: {
  children: ReactNode;
  elevated?: boolean;
  lock?: boolean;
  url: string;
}) {
  return (
    <div className={`frame ${elevated ? "elevated" : ""}`}>
      <FrameBar url={url} lock={lock} />
      <div className="frame-body">{children}</div>
    </div>
  );
}

function FrameBar({ url, lock = false }: { url: string; lock?: boolean }) {
  return (
    <div className="frame-bar">
      <div className="frame-dots"><i /><i /><i /></div>
      <div className="frame-url">
        {lock && <LockIcon />}
        {url}
      </div>
    </div>
  );
}

function FeatureSection({
  id,
  reverse = false,
  eyebrow,
  title,
  lead,
  points,
  image,
  alt,
  url,
}: {
  id: string;
  reverse?: boolean;
  eyebrow: string;
  title: ReactNode;
  lead: string;
  points: [string, string, string][];
  image: string;
  alt: string;
  url: string;
}) {
  return (
    <section className="section-pad" id={id}>
      <div className={`wrap feature ${reverse ? "reverse" : ""}`}>
        <div className="feature-copy reveal">
          <span className="eyebrow">{eyebrow}</span>
          <h2>{title}</h2>
          <p className="lead">{lead}</p>
          <div className="point-list">
            {points.map(([icon, pointTitle, desc], index) => (
              <div key={pointTitle} className="point reveal" style={{ "--d": `${0.04 + index * 0.06}s` } as CSSProperties}>
                <span className="point-ic"><FeatureIcon name={icon} size={15} /></span>
                <span className="point-tx">{pointTitle}<span>{desc}</span></span>
              </div>
            ))}
          </div>
        </div>
        <div className="feature-media reveal-scale" style={{ "--d": ".08s" } as CSSProperties}>
          <BrowserFrame url={url}>
            <Image className="shot-img" src={`${ASSET}/${image}`} alt={alt} width={3444} height={1920} style={{ aspectRatio: "3444/1920" }} />
          </BrowserFrame>
        </div>
      </div>
    </section>
  );
}

function FeatureIcon({ name, size }: { name: string; size: number }) {
  const common = {
    width: size,
    height: size,
    viewBox: "0 0 24 24",
    fill: "none",
    stroke: "currentColor",
    strokeWidth: size > 20 ? 2 : 2.2,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  switch (name) {
    case "calendar":
      return <svg {...common}><rect x="3" y="4" width="18" height="17" rx="2" /><path d="M3 9h18M8 2v4M16 2v4" /></svg>;
    case "copy":
      return <svg {...common}><rect x="9" y="9" width="11" height="11" rx="2" /><path d="M5 15V5a2 2 0 0 1 2-2h8" /></svg>;
    case "clock":
      return <svg {...common}><path d="M12 7v5l3 2" /><circle cx="12" cy="12" r="9" /></svg>;
    case "school":
      return <svg {...common}><path d="M22 10 12 4 2 10l10 6 10-6Z" /><path d="M6 12v5c0 1 2.5 3 6 3s6-2 6-3v-5" /></svg>;
    case "book":
      return <svg {...common}><path d="M4 19.5V6a2 2 0 0 1 2-2h13v15" /><path d="M6 17h13" /></svg>;
    case "user":
      return <svg {...common}><circle cx="12" cy="8" r="4" /><path d="M4 21c0-4 4-6 8-6s8 2 8 6" /></svg>;
    case "checkList":
      return <svg {...common}><path d="M9 11l3 3L22 4" /><path d="M21 12v7a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11" /></svg>;
    case "checkBox":
      return <svg {...common}><rect x="4" y="4" width="16" height="16" rx="3" /><path d="M9 12l2 2 4-4" /></svg>;
    case "history":
      return <svg {...common}><path d="M3 3v5h5" /><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8" /><path d="M12 7v5l3 2" /></svg>;
    case "report":
      return <svg {...common}><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" /><path d="M14 2v6h6M9 13h6M9 17h4" /></svg>;
    default:
      return null;
  }
}

function ArrowIcon() {
  return (
    <svg className="arr" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M5 12h14M13 6l6 6-6 6" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#0ea5e9" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20 6 9 17l-5-5" />
    </svg>
  );
}

function LockIcon() {
  return (
    <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4">
      <rect x="5" y="11" width="14" height="9" rx="2" />
      <path d="M8 11V8a4 4 0 0 1 8 0v3" />
    </svg>
  );
}
