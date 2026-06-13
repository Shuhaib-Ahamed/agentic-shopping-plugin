// AUTO-CONVERTED from /Users/shuhaib/Downloads/Juno Welcome.html.
// Do not edit by hand. See scripts/storefront-convert.py if regenerating.
// 4-layer marching parallax: bunting (90s), far (80s), mid (46s), front (28s).

import { memo } from "react";

export const StorefrontScene = memo(function StorefrontScene() {
  return (
    <>
      {/* bunting strung overhead (slow parallax) */}
      <div
        style={{
          position: "absolute",
          left: "0",
          right: "0",
          top: "14%",
          height: "120px",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            left: "0",
            top: "0",
            width: "4320px",
            height: "120px",
            animation: "marchLeft 90s linear infinite",
            willChange: "transform",
          }}
        >
          <svg width="4320" height="120" viewBox="0 0 4320 120" fill="none">
            <path
              d="M0 24 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0 q120 30 240 0"
              stroke="#C9B6E8"
              strokeWidth="3"
            ></path>
            <polygon points="108,39 132,39 120,57" fill="#7a5cc0"></polygon>
            <polygon points="348,39 372,39 360,57" fill="#E85FA0"></polygon>
            <polygon points="588,39 612,39 600,57" fill="#F9B233"></polygon>
            <polygon points="828,39 852,39 840,57" fill="#2E9E68"></polygon>
            <polygon points="1068,39 1092,39 1080,57" fill="#E89C1C"></polygon>
            <polygon points="1308,39 1332,39 1320,57" fill="#5BB98C"></polygon>
            <polygon points="1548,39 1572,39 1560,57" fill="#7a5cc0"></polygon>
            <polygon points="1788,39 1812,39 1800,57" fill="#E85FA0"></polygon>
            <polygon points="2028,39 2052,39 2040,57" fill="#F9B233"></polygon>
            <polygon points="2268,39 2292,39 2280,57" fill="#2E9E68"></polygon>
            <polygon points="2508,39 2532,39 2520,57" fill="#E89C1C"></polygon>
            <polygon points="2748,39 2772,39 2760,57" fill="#5BB98C"></polygon>
            <polygon points="2988,39 3012,39 3000,57" fill="#7a5cc0"></polygon>
            <polygon points="3228,39 3252,39 3240,57" fill="#E85FA0"></polygon>
            <polygon points="3468,39 3492,39 3480,57" fill="#F9B233"></polygon>
            <polygon points="3708,39 3732,39 3720,57" fill="#2E9E68"></polygon>
            <polygon points="3948,39 3972,39 3960,57" fill="#E89C1C"></polygon>
            <polygon points="4188,39 4212,39 4200,57" fill="#5BB98C"></polygon>
          </svg>
        </div>
      </div>

      {/* moving market street (parallax layers) */}
      <div
        style={{
          position: "absolute",
          left: "0",
          right: "0",
          bottom: "0",
          height: "430px",
          overflow: "hidden",
        }}
      >
        <svg width="0" height="0" style={{ position: "absolute" }} aria-hidden="true">
          <defs id="sf-defs">
            <g id="sf-stallFruit">
              <rect x="10" y="100" width="7" height="232" rx="3" fill="#8A5A2B"></rect>
              <rect x="283" y="100" width="7" height="232" rx="3" fill="#8A5A2B"></rect>
              <path d="M-2 104 H302 L296 150 H4 Z" fill="#E0457A"></path>
              <path
                d="M40 104 L36 150 M92 104 L88 150 M150 104 L146 150 M208 104 L204 150 M260 104 L256 150"
                stroke="#FBD9E8"
                strokeWidth="9"
              ></path>
              <path
                d="M4 150 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 L296 150 Z"
                fill="#C13B68"
              ></path>
              <rect x="12" y="252" width="276" height="78" fill="#C89A5E"></rect>
              <rect x="12" y="246" width="276" height="12" rx="2" fill="#A9712F"></rect>
              <path
                d="M70 258 V330 M150 258 V330 M230 258 V330"
                stroke="#A9712F"
                strokeWidth="2"
              ></path>
              <path
                d="M30 252 L40 214 H104 L110 252 Z"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="2"
              ></path>
              <circle cx="48" cy="224" r="8" fill="#E0457A"></circle>
              <circle cx="66" cy="221" r="8" fill="#E85FA0"></circle>
              <circle cx="84" cy="223" r="8" fill="#E0457A"></circle>
              <circle cx="57" cy="236" r="8" fill="#E85FA0"></circle>
              <circle cx="76" cy="237" r="8" fill="#E0457A"></circle>
              <circle cx="94" cy="234" r="8" fill="#E85FA0"></circle>
              <path
                d="M118 252 L126 216 H188 L196 252 Z"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="2"
              ></path>
              <circle cx="136" cy="226" r="8" fill="#F0922A"></circle>
              <circle cx="154" cy="223" r="8" fill="#F9B233"></circle>
              <circle cx="172" cy="225" r="8" fill="#F0922A"></circle>
              <circle cx="145" cy="238" r="8" fill="#F9B233"></circle>
              <circle cx="164" cy="238" r="8" fill="#F0922A"></circle>
              <circle cx="182" cy="236" r="8" fill="#F9B233"></circle>
              <path
                d="M204 252 L212 218 H274 L282 252 Z"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="2"
              ></path>
              <circle cx="222" cy="228" r="8" fill="#5BB98C"></circle>
              <circle cx="240" cy="225" r="8" fill="#3E9A66"></circle>
              <circle cx="258" cy="227" r="8" fill="#5BB98C"></circle>
              <circle cx="231" cy="240" r="8" fill="#3E9A66"></circle>
              <circle cx="250" cy="239" r="8" fill="#5BB98C"></circle>
              <path d="M150 150 V178" stroke="#3A2566" strokeWidth="2"></path>
              <rect
                x="124"
                y="178"
                width="52"
                height="26"
                rx="5"
                fill="#F9B233"
                stroke="#3A2566"
                strokeWidth="1.6"
              ></rect>
              <path
                d="M134 191 h14 M134 196 h22"
                stroke="#3A2566"
                strokeWidth="2"
                strokeLinecap="round"
              ></path>
              <path
                d="M-16 330 q-9 -42 15 -54 q24 12 15 54 Z"
                fill="#D8C29A"
                stroke="#A9712F"
                strokeWidth="2"
              ></path>
              <ellipse cx="-1" cy="280" rx="16" ry="6" fill="#C29A6A"></ellipse>
              <circle cx="-7" cy="276" r="4" fill="#E0457A"></circle>
              <circle cx="4" cy="274" r="4" fill="#F0922A"></circle>
              <circle cx="-1" cy="279" r="4" fill="#F9B233"></circle>
            </g>
            <g id="sf-stallFlower">
              <rect x="10" y="100" width="7" height="232" rx="3" fill="#6B4A1E"></rect>
              <rect x="283" y="100" width="7" height="232" rx="3" fill="#6B4A1E"></rect>
              <path d="M-2 104 H302 L296 150 H4 Z" fill="#2E9E68"></path>
              <path
                d="M40 104 L36 150 M92 104 L88 150 M150 104 L146 150 M208 104 L204 150 M260 104 L256 150"
                stroke="#CFEFDD"
                strokeWidth="9"
              ></path>
              <path
                d="M4 150 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 L296 150 Z"
                fill="#247F54"
              ></path>
              <rect x="12" y="258" width="276" height="72" fill="#C89A5E"></rect>
              <rect x="12" y="252" width="276" height="12" rx="2" fill="#A9712F"></rect>
              <path
                d="M42 330 L36 270 H94 L88 330 Z"
                fill="#AFC3D4"
                stroke="#7C93A6"
                strokeWidth="2"
              ></path>
              <ellipse cx="65" cy="270" rx="29" ry="6" fill="#9FB6C9"></ellipse>
              <path
                d="M54 270 V198 M65 270 V190 M76 270 V200"
                stroke="#3E9A66"
                strokeWidth="3"
              ></path>
              <circle cx="54" cy="196" r="9" fill="#E85FA0"></circle>
              <circle cx="65" cy="188" r="9" fill="#F9B233"></circle>
              <circle cx="76" cy="198" r="9" fill="#C75CC0"></circle>
              <circle cx="65" cy="190" r="3.5" fill="#FFF3D0"></circle>
              <path
                d="M132 330 L126 270 H184 L178 330 Z"
                fill="#AFC3D4"
                stroke="#7C93A6"
                strokeWidth="2"
              ></path>
              <ellipse cx="155" cy="270" rx="29" ry="6" fill="#9FB6C9"></ellipse>
              <path
                d="M144 270 V196 M155 270 V202 M166 270 V194"
                stroke="#3E9A66"
                strokeWidth="3"
              ></path>
              <circle cx="144" cy="194" r="9" fill="#C75CC0"></circle>
              <circle cx="155" cy="200" r="9" fill="#E85FA0"></circle>
              <circle cx="166" cy="192" r="9" fill="#F9B233"></circle>
              <path
                d="M222 330 L216 270 H274 L268 330 Z"
                fill="#AFC3D4"
                stroke="#7C93A6"
                strokeWidth="2"
              ></path>
              <ellipse cx="245" cy="270" rx="29" ry="6" fill="#9FB6C9"></ellipse>
              <path
                d="M234 270 V200 M245 270 V190 M256 270 V198"
                stroke="#3E9A66"
                strokeWidth="3"
              ></path>
              <circle cx="234" cy="198" r="9" fill="#F9B233"></circle>
              <circle cx="245" cy="188" r="9" fill="#C75CC0"></circle>
              <circle cx="256" cy="196" r="9" fill="#E85FA0"></circle>
              <path d="M150 150 V172" stroke="#3A2566" strokeWidth="2"></path>
              <ellipse
                cx="150"
                cy="184"
                rx="22"
                ry="14"
                fill="#5BB98C"
                stroke="#2E7A4E"
                strokeWidth="1.6"
              ></ellipse>
              <path d="M138 184 q12 -10 24 0" stroke="#2E7A4E" strokeWidth="2" fill="none"></path>
            </g>
            <g id="sf-stallBakery">
              <rect
                x="6"
                y="150"
                width="288"
                height="180"
                fill="#FBEFD9"
                stroke="#4A2E82"
                strokeWidth="2.5"
              ></rect>
              <path d="M-2 110 H302 L296 150 H4 Z" fill="#E89C1C"></path>
              <path
                d="M44 110 L40 150 M96 110 L92 150 M150 110 L146 150 M204 110 L200 150 M256 110 L252 150"
                stroke="#FDEBCB"
                strokeWidth="10"
              ></path>
              <path
                d="M4 150 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 L296 150 Z"
                fill="#C97E12"
              ></path>
              <rect x="66" y="120" width="168" height="26" rx="5" fill="#5B3A1E"></rect>
              <path
                d="M82 133 h16 M104 133 h10 M122 133 h18 M148 133 h12 M166 133 h18 M190 133 h12 M208 133 h16"
                stroke="#FBEFD9"
                strokeWidth="3"
                strokeLinecap="round"
              ></path>
              <rect
                x="24"
                y="166"
                width="178"
                height="124"
                rx="4"
                fill="#FFFFFF"
                stroke="#4A2E82"
                strokeWidth="2"
              ></rect>
              <path d="M24 212 H202 M24 252 H202" stroke="#E2D3BE" strokeWidth="3"></path>
              <rect
                x="60"
                y="192"
                width="44"
                height="18"
                rx="2"
                fill="#F6CFE0"
                stroke="#C13B7A"
                strokeWidth="1.5"
              ></rect>
              <rect
                x="68"
                y="178"
                width="28"
                height="16"
                rx="2"
                fill="#FBE0EC"
                stroke="#C13B7A"
                strokeWidth="1.5"
              ></rect>
              <circle cx="82" cy="174" r="3" fill="#E0457A"></circle>
              <ellipse
                cx="150"
                cy="200"
                rx="20"
                ry="11"
                fill="#D8A15A"
                stroke="#A9712F"
                strokeWidth="1.5"
              ></ellipse>
              <path
                d="M140 196 l4 8 M150 194 l0 9 M160 196 l-4 8"
                stroke="#A9712F"
                strokeWidth="1.5"
              ></path>
              <g>
                <path d="M40 252 l4 -16 h16 l4 16 Z" fill="#C9905A"></path>
                <circle cx="52" cy="234" r="9" fill="#F6CFE0"></circle>
                <circle cx="52" cy="230" r="2.5" fill="#E0457A"></circle>
              </g>
              <g>
                <path d="M96 252 l4 -16 h16 l4 16 Z" fill="#C9905A"></path>
                <circle cx="108" cy="234" r="9" fill="#FBE0EC"></circle>
                <circle cx="108" cy="230" r="2.5" fill="#E0457A"></circle>
              </g>
              <g>
                <path d="M152 252 l4 -16 h16 l4 16 Z" fill="#C9905A"></path>
                <circle cx="164" cy="234" r="9" fill="#F6CFE0"></circle>
                <circle cx="164" cy="230" r="2.5" fill="#E0457A"></circle>
              </g>
              <ellipse
                cx="58"
                cy="270"
                rx="20"
                ry="10"
                fill="#D8A15A"
                stroke="#A9712F"
                strokeWidth="1.5"
              ></ellipse>
              <ellipse
                cx="108"
                cy="270"
                rx="20"
                ry="10"
                fill="#CE9750"
                stroke="#A9712F"
                strokeWidth="1.5"
              ></ellipse>
              <ellipse
                cx="158"
                cy="270"
                rx="20"
                ry="10"
                fill="#D8A15A"
                stroke="#A9712F"
                strokeWidth="1.5"
              ></ellipse>
              <rect
                x="222"
                y="196"
                width="58"
                height="134"
                rx="4"
                fill="#E7D3F2"
                stroke="#4A2E82"
                strokeWidth="2"
              ></rect>
              <circle cx="232" cy="266" r="3" fill="#4A2E82"></circle>
              <path
                d="M18 330 L26 300 H74 L82 330 Z"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="2"
              ></path>
              <path
                d="M30 300 L34 330 M50 300 V330 M66 300 L62 330"
                stroke="#8A5A2B"
                strokeWidth="1.6"
              ></path>
              <ellipse
                cx="40"
                cy="298"
                rx="6"
                ry="16"
                transform="rotate(-22 40 298)"
                fill="#D8A15A"
                stroke="#A9712F"
                strokeWidth="1.4"
              ></ellipse>
              <ellipse
                cx="58"
                cy="296"
                rx="6"
                ry="17"
                transform="rotate(8 58 296)"
                fill="#CE9750"
                stroke="#A9712F"
                strokeWidth="1.4"
              ></ellipse>
            </g>
            <g id="sf-stallGift">
              <rect
                x="6"
                y="150"
                width="288"
                height="180"
                fill="#EFE7FC"
                stroke="#4A2E82"
                strokeWidth="2.5"
              ></rect>
              <path d="M-2 110 H302 L296 150 H4 Z" fill="#7a5cc0"></path>
              <path
                d="M44 110 L40 150 M96 110 L92 150 M150 110 L146 150 M204 110 L200 150 M256 110 L252 150"
                stroke="#E3D9F6"
                strokeWidth="10"
              ></path>
              <path
                d="M4 150 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 q12 14 24 0 L296 150 Z"
                fill="#5B3FA0"
              ></path>
              <g>
                <path d="M70 150 V166" stroke="#3A2566" strokeWidth="2"></path>
                <rect x="63" y="164" width="14" height="5" rx="1" fill="#3A2566"></rect>
                <circle
                  cx="70"
                  cy="180"
                  r="12"
                  fill="#E85FA0"
                  stroke="#C13B7A"
                  strokeWidth="1.5"
                ></circle>
                <circle cx="70" cy="180" r="20" fill="#E85FA0" opacity="0.18"></circle>
                <rect x="63" y="190" width="14" height="5" rx="1" fill="#3A2566"></rect>
              </g>
              <g>
                <path d="M150 150 V160" stroke="#3A2566" strokeWidth="2"></path>
                <rect x="143" y="158" width="14" height="5" rx="1" fill="#3A2566"></rect>
                <circle
                  cx="150"
                  cy="174"
                  r="12"
                  fill="#F9B233"
                  stroke="#C9870F"
                  strokeWidth="1.5"
                ></circle>
                <circle cx="150" cy="174" r="20" fill="#F9B233" opacity="0.2"></circle>
                <rect x="143" y="184" width="14" height="5" rx="1" fill="#3A2566"></rect>
              </g>
              <rect
                x="22"
                y="200"
                width="150"
                height="90"
                rx="4"
                fill="#FFFFFF"
                stroke="#4A2E82"
                strokeWidth="2"
              ></rect>
              <g>
                <rect
                  x="36"
                  y="250"
                  width="56"
                  height="40"
                  rx="3"
                  fill="#E85FA0"
                  stroke="#C13B7A"
                  strokeWidth="1.5"
                ></rect>
                <path d="M64 250 V290 M36 268 H92" stroke="#FBD0E5" strokeWidth="3"></path>
                <path
                  d="M64 250 q-8 -8 -2 -12 q6 2 2 12 q8 -8 2 -12 q-6 2 0 12"
                  fill="#FBD0E5"
                ></path>
              </g>
              <g>
                <rect
                  x="98"
                  y="258"
                  width="48"
                  height="32"
                  rx="3"
                  fill="#F9B233"
                  stroke="#C9870F"
                  strokeWidth="1.5"
                ></rect>
                <path d="M122 258 V290 M98 274 H146" stroke="#FDEBCB" strokeWidth="3"></path>
              </g>
              <g>
                <rect
                  x="58"
                  y="208"
                  width="44"
                  height="42"
                  rx="3"
                  fill="#5BB98C"
                  stroke="#2E7A4E"
                  strokeWidth="1.5"
                ></rect>
                <path d="M80 208 V250 M58 229 H102" stroke="#CDEFDD" strokeWidth="3"></path>
              </g>
              <path
                d="M262 204 Q268 252 276 300 M284 196 Q280 252 276 300 M274 217 Q275 256 276 300"
                stroke="#9A86C0"
                strokeWidth="1.6"
                fill="none"
              ></path>
              <ellipse
                cx="262"
                cy="188"
                rx="13"
                ry="16"
                fill="#E85FA0"
                stroke="#C13B7A"
                strokeWidth="1.5"
              ></ellipse>
              <ellipse
                cx="285"
                cy="180"
                rx="13"
                ry="16"
                fill="#F9B233"
                stroke="#C9870F"
                strokeWidth="1.5"
              ></ellipse>
              <ellipse
                cx="274"
                cy="202"
                rx="12"
                ry="15"
                fill="#7a5cc0"
                stroke="#4A2E82"
                strokeWidth="1.5"
              ></ellipse>
              <rect x="270" y="300" width="11" height="30" rx="3" fill="#6B4A1E"></rect>
              <rect x="16" y="306" width="64" height="24" fill="#C89A5E"></rect>
              <rect x="16" y="300" width="64" height="8" rx="2" fill="#A9712F"></rect>
              <path
                d="M26 306 V286 q0 -8 10 -8 q10 0 10 8 V306 Z"
                fill="#BBD6E6"
                opacity="0.65"
                stroke="#7C93A6"
                strokeWidth="1.4"
              ></path>
              <rect x="24" y="272" width="24" height="6" rx="2" fill="#E85FA0"></rect>
              <circle cx="32" cy="294" r="3" fill="#F0922A"></circle>
              <circle cx="40" cy="298" r="3" fill="#E0457A"></circle>
              <circle cx="36" cy="289" r="3" fill="#F9B233"></circle>
              <path
                d="M52 306 V286 q0 -8 10 -8 q10 0 10 8 V306 Z"
                fill="#BBD6E6"
                opacity="0.65"
                stroke="#7C93A6"
                strokeWidth="1.4"
              ></path>
              <rect x="50" y="272" width="24" height="6" rx="2" fill="#5BB98C"></rect>
              <circle cx="58" cy="294" r="3" fill="#7a5cc0"></circle>
              <circle cx="66" cy="298" r="3" fill="#E85FA0"></circle>
              <circle cx="62" cy="289" r="3" fill="#F9B233"></circle>
            </g>
            <g id="sf-shopperA">
              <ellipse cx="2" cy="331" rx="20" ry="4" fill="rgba(74,46,130,.15)"></ellipse>
              <path d="M-8 284 L-12 330 L-3 330 L-1 286 Z" fill="#3A3158"></path>
              <path d="M6 284 L13 327 L21 325 L10 284 Z" fill="#2C2647"></path>
              <path d="M-14 230 Q0 222 14 230 L12 288 L-12 288 Z" fill="#5B4B8A"></path>
              <rect x="-3" y="222" width="6" height="9" fill="#E8B98F"></rect>
              <path
                d="M13 236 L21 266"
                stroke="#5B4B8A"
                strokeWidth="7"
                strokeLinecap="round"
              ></path>
              <rect x="13" y="266" width="21" height="24" rx="2" fill="#E0457A"></rect>
              <path
                d="M17 266 v-5 a6.5 6.5 0 0 1 13 0 v5"
                fill="none"
                stroke="#C13B7A"
                strokeWidth="2"
              ></path>
              <circle cx="0" cy="212" r="12" fill="#E8B98F"></circle>
              <path d="M-12 209 a12 12 0 0 1 24 0 q-12 -9 -24 0 Z" fill="#3A2E28"></path>
            </g>
            <g id="sf-shopperB">
              <ellipse cx="0" cy="331" rx="22" ry="4" fill="rgba(74,46,130,.15)"></ellipse>
              <path d="M-6 300 L-8 330 H-1 Z" fill="#6B4A2E"></path>
              <path d="M6 300 L8 330 H1 Z" fill="#6B4A2E"></path>
              <path d="M-13 236 Q0 230 13 236 L21 306 H-21 Z" fill="#C75C97"></path>
              <circle cx="-7" cy="270" r="2.4" fill="#FBD0E5"></circle>
              <circle cx="5" cy="262" r="2.4" fill="#FBD0E5"></circle>
              <circle cx="-2" cy="288" r="2.4" fill="#FBD0E5"></circle>
              <circle cx="9" cy="290" r="2.4" fill="#FBD0E5"></circle>
              <path
                d="M14 242 L23 274"
                stroke="#C75C97"
                strokeWidth="6"
                strokeLinecap="round"
              ></path>
              <path
                d="M15 274 h24 l-3 24 h-18 Z"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="1.5"
              ></path>
              <path d="M15 274 q12 -11 24 0" fill="none" stroke="#7A4A24" strokeWidth="2"></path>
              <circle cx="21" cy="282" r="3.4" fill="#E0457A"></circle>
              <circle cx="31" cy="283" r="3.4" fill="#F9B233"></circle>
              <circle cx="26" cy="290" r="3.4" fill="#5BB98C"></circle>
              <circle cx="0" cy="216" r="11" fill="#E8B98F"></circle>
              <path
                d="M-11 214 q0 -15 11 -15 q11 0 11 15 q0 11 -4 20 l-4 -2 q3 -11 0 -17 q-7 -4 -14 0 q-3 6 0 17 l-4 2 q-4 -9 -4 -20 Z"
                fill="#2A2230"
              ></path>
            </g>
            <g id="sf-shopperC">
              <ellipse cx="0" cy="331" rx="14" ry="3.5" fill="rgba(74,46,130,.15)"></ellipse>
              <path d="M-5 300 L-7 330 H-2 Z" fill="#3A3158"></path>
              <path d="M5 300 L7 330 H2 Z" fill="#2C2647"></path>
              <path d="M-10 268 Q0 262 10 268 L9 304 H-9 Z" fill="#2E9E68"></path>
              <path
                d="M9 272 L18 250"
                stroke="#2E9E68"
                strokeWidth="5"
                strokeLinecap="round"
              ></path>
              <path
                d="M18 250 Q22 226 20 210"
                stroke="#9A86C0"
                strokeWidth="1.4"
                fill="none"
              ></path>
              <ellipse
                cx="20"
                cy="200"
                rx="11"
                ry="13"
                fill="#E0457A"
                stroke="#C13B7A"
                strokeWidth="1.4"
              ></ellipse>
              <circle cx="0" cy="252" r="9" fill="#E8B98F"></circle>
              <path d="M-9 250 a9 9 0 0 1 18 0 q-9 -7 -18 0 Z" fill="#4A352A"></path>
            </g>
            <g id="sf-lamp">
              <rect x="-5" y="120" width="10" height="210" rx="4" fill="#3C2A66"></rect>
              <rect x="-16" y="324" width="32" height="8" rx="3" fill="#3C2A66"></rect>
              <path d="M-12 116 h24 l-5 -10 h-14 Z" fill="#3C2A66"></path>
              <rect
                x="-11"
                y="116"
                width="22"
                height="22"
                rx="3"
                fill="#F9B233"
                stroke="#3C2A66"
                strokeWidth="2"
              ></rect>
              <circle cx="0" cy="127" r="26" fill="#F9B233" opacity="0.16"></circle>
              <path d="M14 132 q15 -8 18 8" stroke="#3C2A66" strokeWidth="3" fill="none"></path>
              <path d="M24 152 h22 l-3 17 h-16 Z" fill="#8A5A2B"></path>
              <circle cx="30" cy="152" r="5" fill="#E85FA0"></circle>
              <circle cx="41" cy="152" r="5" fill="#F9B233"></circle>
              <circle cx="36" cy="148" r="5" fill="#C75CC0"></circle>
              <path
                d="M28 169 q5 16 0 24 M42 169 q-5 16 0 24"
                stroke="#3E9A66"
                strokeWidth="2"
                fill="none"
              ></path>
            </g>
            <g id="sf-cart">
              <path d="M-48 180 Q0 138 48 180 Z" fill="#E0457A"></path>
              <path
                d="M-48 180 Q-30 150 0 142 M-24 180 Q-16 150 0 142 M24 180 Q16 150 0 142 M48 180 Q30 150 0 142"
                stroke="#FBD9E8"
                strokeWidth="2.5"
                fill="none"
              ></path>
              <path
                d="M-48 180 q12 12 24 0 q12 12 24 0 q12 12 24 0 q12 12 24 0"
                fill="#C13B68"
              ></path>
              <rect x="-3" y="178" width="6" height="76" fill="#7A4A24"></rect>
              <rect
                x="-44"
                y="250"
                width="88"
                height="62"
                rx="4"
                fill="#C89A5E"
                stroke="#7A4A24"
                strokeWidth="2"
              ></rect>
              <path
                d="M-44 270 H44 M-16 250 V312 M16 250 V312"
                stroke="#A9712F"
                strokeWidth="2"
              ></path>
              <path
                d="M-36 250 l4 -16 h22 l4 16 Z"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="1.6"
              ></path>
              <circle cx="-26" cy="242" r="6" fill="#F0922A"></circle>
              <circle cx="-12" cy="242" r="6" fill="#E0457A"></circle>
              <circle
                cx="-24"
                cy="312"
                r="16"
                fill="#5B4B6A"
                stroke="#3A2566"
                strokeWidth="3"
              ></circle>
              <circle cx="-24" cy="312" r="4" fill="#3A2566"></circle>
              <circle
                cx="24"
                cy="312"
                r="16"
                fill="#5B4B6A"
                stroke="#3A2566"
                strokeWidth="3"
              ></circle>
              <circle cx="24" cy="312" r="4" fill="#3A2566"></circle>
            </g>
            <g id="sf-barrel">
              <path
                d="M-18 330 Q-24 302 -18 276 H18 Q24 302 18 330 Z"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="2"
              ></path>
              <path d="M-21 292 H21 M-21 314 H21" stroke="#7A4A24" strokeWidth="2.5"></path>
              <ellipse cx="0" cy="276" rx="18" ry="5" fill="#9C6A30"></ellipse>
              <circle cx="-6" cy="272" r="6" fill="#E85FA0"></circle>
              <circle cx="6" cy="270" r="6" fill="#F9B233"></circle>
              <circle cx="0" cy="266" r="6" fill="#C75CC0"></circle>
            </g>
            <g id="sf-crateStack">
              <rect
                x="-22"
                y="300"
                width="44"
                height="30"
                fill="#B07A3C"
                stroke="#7A4A24"
                strokeWidth="2"
              ></rect>
              <rect
                x="-18"
                y="272"
                width="40"
                height="28"
                fill="#C2884A"
                stroke="#7A4A24"
                strokeWidth="2"
              ></rect>
              <path
                d="M-9 300 V330 M4 300 V330 M-4 272 V300 M9 272 V300"
                stroke="#8A5A2B"
                strokeWidth="1.5"
              ></path>
              <circle cx="-8" cy="270" r="5" fill="#E0457A"></circle>
              <circle cx="2" cy="268" r="5" fill="#F0922A"></circle>
              <circle cx="12" cy="270" r="5" fill="#5BB98C"></circle>
            </g>
            <g id="sf-far">
              {/* soft ground shadows under the towers */}
              <g fill="rgba(74,46,130,.07)">
                <ellipse cx="96" cy="338" rx="92" ry="9"></ellipse>
                <ellipse cx="330" cy="338" rx="80" ry="9"></ellipse>
                <ellipse cx="560" cy="338" rx="78" ry="9"></ellipse>
                <ellipse cx="775" cy="338" rx="86" ry="9"></ellipse>
                <ellipse cx="1010" cy="338" rx="72" ry="9"></ellipse>
                <ellipse cx="1230" cy="338" rx="92" ry="9"></ellipse>
              </g>

              {/* TOWER 1 */}
              <rect x="30" y="44" width="132" height="296" fill="#E4D8F4"></rect>
              <rect x="138" y="44" width="24" height="296" fill="#CDBCEC"></rect>
              <rect x="30" y="44" width="132" height="9" fill="#BFAAE2"></rect>
              <path
                d="M34 78 H158 M34 106 H158 M34 134 H158 M34 162 H158 M34 190 H158 M34 218 H158 M34 246 H158 M34 274 H158 M34 302 H158"
                stroke="#CFBDEC"
                strokeWidth="2"
              ></path>
              <path
                d="M64 53 V336 M98 53 V336 M130 53 V336"
                stroke="#CFBDEC"
                strokeWidth="2"
              ></path>
              <g fill="#F7E7C2">
                <rect x="40" y="84" width="18" height="16"></rect>
                <rect x="106" y="140" width="18" height="16"></rect>
                <rect x="72" y="196" width="18" height="16"></rect>
                <rect x="40" y="252" width="18" height="16"></rect>
              </g>
              <rect x="70" y="20" width="40" height="24" fill="#C7B4E6"></rect>
              <rect x="74" y="12" width="8" height="10" fill="#B49FD6"></rect>
              <rect x="98" y="12" width="8" height="10" fill="#B49FD6"></rect>
              <path d="M150 28 V44" stroke="#A892CE" strokeWidth="3"></path>
              <circle cx="150" cy="26" r="3" fill="#E0457A"></circle>

              {/* TOWER 2 (slim, very tall) */}
              <rect x="196" y="22" width="92" height="318" fill="#E8DCF6"></rect>
              <rect x="270" y="22" width="18" height="318" fill="#D2C2EE"></rect>
              <rect x="196" y="22" width="92" height="8" fill="#C2AEE4"></rect>
              <path
                d="M200 52 H284 M200 80 H284 M200 108 H284 M200 136 H284 M200 164 H284 M200 192 H284 M200 220 H284 M200 248 H284 M200 276 H284 M200 304 H284"
                stroke="#D4C3EF"
                strokeWidth="2"
              ></path>
              <path d="M224 30 V336 M250 30 V336" stroke="#D4C3EF" strokeWidth="2"></path>
              <g fill="#F7E7C2">
                <rect x="204" y="58" width="16" height="16"></rect>
                <rect x="230" y="142" width="16" height="16"></rect>
                <rect x="204" y="226" width="16" height="16"></rect>
                <rect x="230" y="282" width="16" height="16"></rect>
              </g>
              <path d="M242 8 V22" stroke="#A892CE" strokeWidth="3"></path>
              <circle cx="242" cy="6" r="3" fill="#F9B233"></circle>

              {/* TOWER 3 (broad, tallest) */}
              <rect x="324" y="14" width="150" height="326" fill="#E2D6F2"></rect>
              <rect x="450" y="14" width="24" height="326" fill="#CABAEA"></rect>
              <path d="M324 14 L399 -16 L474 14 Z" fill="#D8C8EE"></path>
              <path
                d="M330 48 H468 M330 76 H468 M330 104 H468 M330 132 H468 M330 160 H468 M330 188 H468 M330 216 H468 M330 244 H468 M330 272 H468 M330 300 H468"
                stroke="#CCBAEA"
                strokeWidth="2"
              ></path>
              <path
                d="M360 22 V336 M396 22 V336 M432 22 V336"
                stroke="#CCBAEA"
                strokeWidth="2"
              ></path>
              <g fill="#F7E7C2">
                <rect x="338" y="54" width="18" height="16"></rect>
                <rect x="404" y="110" width="18" height="16"></rect>
                <rect x="368" y="194" width="18" height="16"></rect>
                <rect x="338" y="278" width="18" height="16"></rect>
                <rect x="404" y="306" width="18" height="16"></rect>
              </g>

              {/* TOWER 4 (medium) */}
              <rect x="500" y="96" width="118" height="244" fill="#E8DCF6"></rect>
              <rect x="600" y="96" width="18" height="244" fill="#D2C2EE"></rect>
              <rect x="500" y="96" width="118" height="8" fill="#C2AEE4"></rect>
              <path
                d="M504 128 H614 M504 156 H614 M504 184 H614 M504 212 H614 M504 240 H614 M504 268 H614 M504 296 H614"
                stroke="#D4C3EF"
                strokeWidth="2"
              ></path>
              <path d="M534 104 V336 M566 104 V336" stroke="#D4C3EF" strokeWidth="2"></path>
              <g fill="#F7E7C2">
                <rect x="508" y="134" width="18" height="16"></rect>
                <rect x="572" y="218" width="18" height="16"></rect>
                <rect x="508" y="274" width="18" height="16"></rect>
              </g>
              <rect x="540" y="76" width="34" height="20" fill="#C7B4E6"></rect>

              {/* TOWER 5 (slim tall) */}
              <rect x="656" y="40" width="96" height="300" fill="#E4D8F4"></rect>
              <rect x="734" y="40" width="18" height="300" fill="#CDBCEC"></rect>
              <rect x="656" y="40" width="96" height="8" fill="#BFAAE2"></rect>
              <path
                d="M660 72 H748 M660 100 H748 M660 128 H748 M660 156 H748 M660 184 H748 M660 212 H748 M660 240 H748 M660 268 H748 M660 296 H748"
                stroke="#CFBDEC"
                strokeWidth="2"
              ></path>
              <path d="M686 48 V336 M712 48 V336" stroke="#CFBDEC" strokeWidth="2"></path>
              <g fill="#F7E7C2">
                <rect x="664" y="78" width="16" height="16"></rect>
                <rect x="690" y="162" width="16" height="16"></rect>
                <rect x="664" y="246" width="16" height="16"></rect>
              </g>
              <path d="M704 26 V40" stroke="#A892CE" strokeWidth="3"></path>
              <circle cx="704" cy="24" r="3" fill="#E0457A"></circle>

              {/* TOWER 6 (broad) */}
              <rect x="788" y="58" width="146" height="282" fill="#E2D6F2"></rect>
              <rect x="910" y="58" width="24" height="282" fill="#CABAEA"></rect>
              <rect x="788" y="58" width="146" height="9" fill="#BFAAE2"></rect>
              <path
                d="M792 92 H930 M792 120 H930 M792 148 H930 M792 176 H930 M792 204 H930 M792 232 H930 M792 260 H930 M792 288 H930 M792 316 H930"
                stroke="#CCBAEA"
                strokeWidth="2"
              ></path>
              <path
                d="M824 67 V336 M860 67 V336 M896 67 V336"
                stroke="#CCBAEA"
                strokeWidth="2"
              ></path>
              <g fill="#F7E7C2">
                <rect x="800" y="98" width="18" height="16"></rect>
                <rect x="866" y="154" width="18" height="16"></rect>
                <rect x="830" y="238" width="18" height="16"></rect>
                <rect x="800" y="294" width="18" height="16"></rect>
              </g>
              <rect x="828" y="38" width="36" height="20" fill="#C7B4E6"></rect>
              <rect x="832" y="30" width="8" height="8" fill="#B49FD6"></rect>

              {/* TOWER 7 (medium) */}
              <rect x="968" y="86" width="108" height="254" fill="#E8DCF6"></rect>
              <rect x="1058" y="86" width="18" height="254" fill="#D2C2EE"></rect>
              <rect x="968" y="86" width="108" height="8" fill="#C2AEE4"></rect>
              <path
                d="M972 118 H1072 M972 146 H1072 M972 174 H1072 M972 202 H1072 M972 230 H1072 M972 258 H1072 M972 286 H1072"
                stroke="#D4C3EF"
                strokeWidth="2"
              ></path>
              <path d="M1000 94 V336 M1032 94 V336" stroke="#D4C3EF" strokeWidth="2"></path>
              <g fill="#F7E7C2">
                <rect x="976" y="124" width="18" height="16"></rect>
                <rect x="1040" y="208" width="18" height="16"></rect>
                <rect x="976" y="264" width="18" height="16"></rect>
              </g>
              <path d="M1022 66 V86" stroke="#A892CE" strokeWidth="3"></path>
              <circle cx="1022" cy="64" r="3" fill="#F9B233"></circle>

              {/* TOWER 8 (slim very tall) */}
              <rect x="1112" y="28" width="92" height="312" fill="#E4D8F4"></rect>
              <rect x="1186" y="28" width="18" height="312" fill="#CDBCEC"></rect>
              <rect x="1112" y="28" width="92" height="8" fill="#BFAAE2"></rect>
              <path
                d="M1116 60 H1200 M1116 88 H1200 M1116 116 H1200 M1116 144 H1200 M1116 172 H1200 M1116 200 H1200 M1116 228 H1200 M1116 256 H1200 M1116 284 H1200 M1116 312 H1200"
                stroke="#CFBDEC"
                strokeWidth="2"
              ></path>
              <path d="M1140 36 V336 M1166 36 V336" stroke="#CFBDEC" strokeWidth="2"></path>
              <g fill="#F7E7C2">
                <rect x="1120" y="66" width="16" height="16"></rect>
                <rect x="1146" y="150" width="16" height="16"></rect>
                <rect x="1120" y="234" width="16" height="16"></rect>
                <rect x="1146" y="290" width="16" height="16"></rect>
              </g>
              <path d="M1158 14 V28" stroke="#A892CE" strokeWidth="3"></path>
              <circle cx="1158" cy="12" r="3" fill="#E0457A"></circle>

              {/* TOWER 9 (broad, fills gap to tile edge) */}
              <rect x="1238" y="70" width="150" height="270" fill="#E2D6F2"></rect>
              <rect x="1364" y="70" width="24" height="270" fill="#CABAEA"></rect>
              <rect x="1238" y="70" width="150" height="9" fill="#BFAAE2"></rect>
              <path
                d="M1244 104 H1382 M1244 132 H1382 M1244 160 H1382 M1244 188 H1382 M1244 216 H1382 M1244 244 H1382 M1244 272 H1382 M1244 300 H1382"
                stroke="#CCBAEA"
                strokeWidth="2"
              ></path>
              <path
                d="M1276 79 V336 M1312 79 V336 M1346 79 V336"
                stroke="#CCBAEA"
                strokeWidth="2"
              ></path>
              <g fill="#F7E7C2">
                <rect x="1252" y="110" width="18" height="16"></rect>
                <rect x="1318" y="166" width="18" height="16"></rect>
                <rect x="1282" y="250" width="18" height="16"></rect>
              </g>
              <rect x="1280" y="50" width="36" height="20" fill="#C7B4E6"></rect>
            </g>

            <g id="sf-row">
              <use href="#sf-stallFruit" x="20"></use>
              <use href="#sf-barrel" x="352"></use>
              <use href="#sf-stallFlower" x="380"></use>
              <use href="#sf-crateStack" x="712"></use>
              <use href="#sf-stallBakery" x="740"></use>
              <use href="#sf-barrel" x="1072"></use>
              <use href="#sf-stallGift" x="1100"></use>
            </g>

            <g id="sf-front">
              <use href="#sf-cart" x="178"></use>
              <use href="#sf-shopperA" x="72"></use>
              <use href="#sf-shopperB" x="330"></use>
              <use href="#sf-shopperC" x="468"></use>
              <use href="#sf-lamp" x="610"></use>
              <use href="#sf-shopperA" x="812"></use>
              <use href="#sf-shopperB" x="988"></use>
              <use href="#sf-shopperC" x="1158"></use>
              <use href="#sf-lamp" x="1330"></use>
            </g>
          </defs>
        </svg>

        {/* FAR rooftops (slowest) */}
        <div
          style={{
            position: "absolute",
            left: "0",
            bottom: "0",
            width: "4320px",
            height: "360px",
            animation: "marchLeft 80s linear infinite",
            willChange: "transform",
          }}
        >
          <svg width="4320" height="360" viewBox="0 0 4320 360" fill="none">
            <use href="#sf-far" x="0"></use>
            <use href="#sf-far" x="1440"></use>
            <use href="#sf-far" x="2880"></use>
          </svg>
        </div>

        {/* ground / cobbles */}
        <div
          style={{
            position: "absolute",
            left: "0",
            right: "0",
            bottom: "0",
            height: "26px",
            background: "linear-gradient(180deg,#EBE1F7,#DFD3F1)",
            borderTop: "2.5px solid #4A2E82",
          }}
        ></div>

        {/* STALLS row (medium) */}
        <div
          style={{
            position: "absolute",
            left: "0",
            bottom: "0",
            width: "4320px",
            height: "360px",
            animation: "marchLeft 46s linear infinite",
            willChange: "transform",
          }}
        >
          <svg width="4320" height="360" viewBox="0 0 4320 360" fill="none">
            <use href="#sf-row" x="0"></use>
            <use href="#sf-row" x="1440"></use>
            <use href="#sf-row" x="2880"></use>
          </svg>
        </div>

        {/* FOREGROUND shoppers + props (fastest) */}
        <div
          style={{
            position: "absolute",
            left: "0",
            bottom: "0",
            width: "4320px",
            height: "360px",
            animation: "marchLeft 28s linear infinite",
            willChange: "transform",
          }}
        >
          <svg width="4320" height="360" viewBox="0 0 4320 360" fill="none">
            <use href="#sf-front" x="0"></use>
            <use href="#sf-front" x="1440"></use>
            <use href="#sf-front" x="2880"></use>
          </svg>
        </div>
      </div>
    </>
  );
});
