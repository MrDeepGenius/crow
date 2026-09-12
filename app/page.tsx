"use client";

export default function Home() {
  const handleCreateProduct = () => {
    window.location.href = "/create";
  };

  return (
    <main
      style={{
        minHeight: "100vh",
        background: "#050505",
        color: "white",
        fontFamily: '"Inter", system-ui, -apple-system, "Segoe UI", Roboto, sans-serif',
      }}
    >
      <nav
        style={{
          height: "80px",
          borderBottom: "1px solid rgba(255,255,255,0.1)",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          padding: "0 40px",
          background: "rgba(0,0,0,0.7)",
        }}
      >
        <img
          src="/crowlogo.png"
          alt="Crow Market"
          style={{
            height: "45px",
            width: "auto",
            objectFit: "contain",
          }}
        />

        <div
          style={{
            display: "flex",
            gap: "30px",
            color: "#999",
            fontSize: "14px",
          }}
        >
          <span>Crear</span>
          <span>Marketplace</span>
          <span>Afiliados</span>
          <span>Cómo funciona</span>
        </div>

        <button
          style={{
            background: "white",
            color: "black",
            border: "none",
            borderRadius: "10px",
            padding: "12px 20px",
            fontWeight: "bold",
            cursor: "pointer",
          }}
        >
          Crear cuenta
        </button>
      </nav>

      <section
        style={{
          minHeight: "650px",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "80px 40px",
          background:
            "radial-gradient(circle at 70% 40%, rgba(130,50,255,0.25), transparent 40%)",
        }}
      >
        <div
          style={{
            width: "100%",
            maxWidth: "1200px",
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "70px",
            alignItems: "center",
          }}
        >
          <div>
            <div
              style={{
                display: "inline-block",
                padding: "9px 15px",
                borderRadius: "30px",
                border: "1px solid rgba(150,80,255,0.3)",
                background: "rgba(130,50,255,0.1)",
                color: "#c7a7ff",
                fontSize: "14px",
                marginBottom: "25px",
              }}
            >
              Inteligencia artificial para creadores
            </div>

            <h1
              style={{
                fontSize: "clamp(48px, 6vw, 82px)",
                lineHeight: "0.98",
                margin: "0",
                fontWeight: "800",
              }}
            >
              Tu idea.
              <br />

              <span
                style={{
                  background:
                    "linear-gradient(90deg, #b88cff, #8b5cf6, #e879f9)",
                  WebkitBackgroundClip: "text",
                  WebkitTextFillColor: "transparent",
                }}
              >
                Nuestra IA.
              </span>

              <br />

              Tu producto.
            </h1>

            <p
              style={{
                color: "#999",
                fontSize: "19px",
                lineHeight: "1.7",
                maxWidth: "580px",
                marginTop: "30px",
              }}
            >
              Crea productos digitales profesionales con inteligencia
              artificial. Desde una simple idea hasta un producto terminado
              y listo para vender.
            </p>

            <div
              style={{
                display: "flex",
                gap: "15px",
                marginTop: "35px",
                flexWrap: "wrap",
              }}
            >
              <button
                onClick={handleCreateProduct}
                style={{
                  background: "linear-gradient(90deg, #7c3aed, #9333ea)",
                  color: "white",
                  border: "none",
                  borderRadius: "14px",
                  padding: "17px 25px",
                  fontSize: "16px",
                  fontWeight: "bold",
                  cursor: "pointer",
                  boxShadow: "0 0 35px rgba(124,58,237,0.3)",
                }}
              >
                Crear mi producto →
              </button>

              <button
                style={{
                  background: "rgba(255,255,255,0.04)",
                  color: "white",
                  border: "1px solid rgba(255,255,255,0.1)",
                  borderRadius: "14px",
                  padding: "17px 25px",
                  fontSize: "16px",
                  cursor: "pointer",
                }}
              >
                ▶ Ver cómo funciona
              </button>
            </div>
          </div>

          <div
            style={{
              borderRadius: "25px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(15,15,18,0.9)",
              boxShadow: "0 0 80px rgba(124,58,237,0.15)",
              overflow: "hidden",
            }}
          >
            <div
              style={{
                padding: "20px",
                borderBottom: "1px solid rgba(255,255,255,0.1)",
                display: "flex",
                alignItems: "center",
                gap: "12px",
              }}
            >
              <div
                style={{
                  width: "38px",
                  height: "38px",
                  borderRadius: "10px",
                  background: "linear-gradient(135deg,#7c3aed,#a855f7)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                ✦
              </div>

              <div>
                <strong>Crow Create Studio</strong>

                <div
                  style={{
                    fontSize: "12px",
                    color: "#666",
                    marginTop: "3px",
                  }}
                >
                  Intelligence Engine
                </div>
              </div>

              <div
                style={{
                  marginLeft: "auto",
                  fontSize: "12px",
                  color: "#4ade80",
                }}
              >
                ● Online
              </div>
            </div>

            <div style={{ padding: "25px" }}>
              <div
                style={{
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "15px",
                  padding: "18px",
                  color: "#ddd",
                  lineHeight: "1.6",
                }}
              >
                <div
                  style={{
                    color: "#a78bfa",
                    fontSize: "12px",
                    marginBottom: "8px",
                  }}
                >
                  CROW AI
                </div>

                ¡Hola!
                <br />
                <br />
                Cuéntame qué tienes en mente.
                <br />
                ¿Qué producto digital te gustaría crear?
              </div>

              <div
                style={{
                  marginTop: "18px",
                  marginLeft: "15%",
                  background: "rgba(124,58,237,0.15)",
                  border: "1px solid rgba(124,58,237,0.2)",
                  borderRadius: "15px",
                  padding: "18px",
                  color: "#ddd",
                }}
              >
                Quiero crear un curso para aprender a vender en TikTok.
              </div>

              <div
                style={{
                  marginTop: "18px",
                  background: "rgba(255,255,255,0.04)",
                  borderRadius: "15px",
                  padding: "18px",
                  color: "#ddd",
                  lineHeight: "1.6",
                }}
              >
                <div
                  style={{
                    color: "#a78bfa",
                    fontSize: "12px",
                    marginBottom: "8px",
                  }}
                >
                  CROW AI
                </div>

                Perfecto. Voy a convertir esa idea en un producto
                completamente estructurado.

                <div
                  style={{
                    marginTop: "15px",
                    padding: "15px",
                    borderRadius: "12px",
                    background: "rgba(0,0,0,0.4)",
                    border: "1px solid rgba(124,58,237,0.15)",
                  }}
                >
                  <strong>PRODUCT BLUEPRINT</strong>

                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "repeat(3,1fr)",
                      gap: "8px",
                      marginTop: "15px",
                    }}
                  >
                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        padding: "12px",
                        borderRadius: "8px",
                      }}
                    >
                      <small style={{ color: "#666" }}>Módulos</small>
                      <br />
                      <strong>4</strong>
                    </div>

                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        padding: "12px",
                        borderRadius: "8px",
                      }}
                    >
                      <small style={{ color: "#666" }}>Lecciones</small>
                      <br />
                      <strong>10</strong>
                    </div>

                    <div
                      style={{
                        background: "rgba(255,255,255,0.04)",
                        padding: "12px",
                        borderRadius: "8px",
                      }}
                    >
                      <small style={{ color: "#666" }}>Formato</small>
                      <br />
                      <strong>Web</strong>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div
              style={{
                padding: "18px",
                borderTop: "1px solid rgba(255,255,255,0.1)",
              }}
            >
              <div
                style={{
                  padding: "15px",
                  borderRadius: "12px",
                  background: "rgba(0,0,0,0.5)",
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "#555",
                }}
              >
                Cuéntale a Crow qué quieres crear...
              </div>
            </div>
          </div>
        </div>
      </section>

      <section
        style={{
          padding: "90px 40px",
          maxWidth: "1200px",
          margin: "0 auto",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <div
            style={{
              color: "#a78bfa",
              fontSize: "14px",
              fontWeight: "bold",
            }}
          >
            CROW MARKET
          </div>

          <h2
            style={{
              fontSize: "42px",
              margin: "12px 0",
            }}
          >
            De una idea a un producto real.
          </h2>

          <p
            style={{
              color: "#777",
              fontSize: "17px",
            }}
          >
            Crea, publica y vende dentro de un mismo ecosistema.
          </p>
        </div>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(3,1fr)",
            gap: "20px",
            marginTop: "50px",
          }}
        >
          <div
            style={{
              padding: "30px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <div style={{ fontSize: "30px" }}>✦</div>
            <h3>Crear con IA</h3>
            <p style={{ color: "#777", lineHeight: "1.6" }}>
              Crow entiende tu idea y te ayuda a convertirla en un producto
              digital.
            </p>
          </div>

          <div
            style={{
              padding: "30px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <div style={{ fontSize: "30px" }}>◈</div>
            <h3>Marketplace</h3>
            <p style={{ color: "#777", lineHeight: "1.6" }}>
              Publica tus productos y permite que compradores los descubran.
            </p>
          </div>

          <div
            style={{
              padding: "30px",
              borderRadius: "20px",
              border: "1px solid rgba(255,255,255,0.1)",
              background: "rgba(255,255,255,0.025)",
            }}
          >
            <div style={{ fontSize: "30px" }}>♢</div>
            <h3>Afiliados</h3>
            <p style={{ color: "#777", lineHeight: "1.6" }}>
              Crea una red de afiliados para aumentar el alcance de tus
              productos.
            </p>
          </div>
        </div>
      </section>

      <footer
        style={{
          borderTop: "1px solid rgba(255,255,255,0.1)",
          padding: "35px",
          textAlign: "center",
          color: "#555",
        }}
      >
        Crow Market © 2026
      </footer>
    </main>
  );
}