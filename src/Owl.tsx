export function Owl({
  small = false,
  happy = false,
}: {
  small?: boolean;
  happy?: boolean;
}) {
  return (
    <svg
      className={`owl ${small ? "owl-small" : ""} ${happy ? "owl-happy" : ""}`}
      viewBox="0 0 280 260"
      role="img"
      aria-label="Íris, a coruja do Ninho"
    >
      <g className="owl-float">
        <ellipse cx="143" cy="236" rx="70" ry="8" fill="none" />
        <path
          d="M59 204 Q93 190 139 205 Q185 187 224 201 L215 224 Q180 215 141 231 Q97 216 60 223Z"
          fill="#f4dda5"
        />
        <path
          d="M139 205 L141 231 M70 210 Q108 207 130 216 M151 216 Q180 207 212 212"
          fill="none"
          stroke="#b39e70"
          strokeWidth="3"
        />
        <path
          d="M66 80 L69 28 L109 56 Q139 42 169 55 L211 29 L213 88 Q229 126 209 174 Q190 214 139 217 Q80 215 65 172 Q49 126 66 80"
          fill="#80b9a0"
        />
        <path
          d="M68 88 Q71 58 105 57 Q139 55 140 84 Q155 51 186 59 Q215 63 211 101 Q204 147 142 174 Q79 148 68 88"
          fill="#f7f1db"
        />
        <path
          d="M66 111 Q36 151 69 189 Q80 169 88 154"
          fill="#579781"
          className="owl-wing"
        />
        <path d="M211 111 Q241 151 209 189 Q195 164 191 154" fill="#579781" />
        <g className="owl-eyes">
          <ellipse cx="108" cy="99" rx="13" ry="19" fill="#213f37" />
          <ellipse cx="172" cy="99" rx="13" ry="19" fill="#213f37" />
          <circle cx="111" cy="93" r="4" fill="white" />
          <circle cx="175" cy="93" r="4" fill="white" />
        </g>
        <path d="M129 119 Q140 115 151 119 L141 135Z" fill="#dd9659" />
        <path
          d="M116 165 L123 174 L130 165 M137 176 L144 185 L151 176 M158 165 L165 174 L172 165"
          fill="none"
          stroke="#4d8a74"
          strokeWidth="4"
          strokeLinecap="round"
        />
        <path
          d="M116 214 L110 225 M126 215 L124 226 M156 215 L156 226 M166 214 L172 224"
          stroke="#d29c57"
          strokeWidth="5"
          strokeLinecap="round"
        />
      </g>
      {!small && (
        <g fill="#d1e6a6" className="owl-stars">
          <path d="M36 47 l3 9 9 3 -9 3 -3 9 -3-9 -9-3 9-3Z" />
          <path d="M235 94 l2 7 7 2 -7 2 -2 7 -2-7 -7-2 7-2Z" />
          <circle cx="232" cy="190" r="3" />
          <circle cx="41" cy="169" r="3" />
          <path d="M145 15 l2 5 5 2 -5 2 -2 5 -2-5 -5-2 5-2Z" />
        </g>
      )}
    </svg>
  );
}
