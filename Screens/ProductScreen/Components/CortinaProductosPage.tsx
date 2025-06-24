import React from "react";
import { Dimensions } from "react-native";
import Svg, { Defs, Filter, G, Line, FeOffset, FeGaussianBlur, FeFlood, FeComposite } from "react-native-svg";

const { width } = Dimensions.get("window"); // Obtener ancho de pantalla

const LinesSVG: React.FC = () => {
  const numLines = 50; // Número de líneas verticales
  const lineSpacing = width / numLines; // Espaciado entre líneas
  const heights = [
    351, 353, 351, 353, 351, 353, 351, 351, 315, 305,
    304, 305, 304, 305, 311, 312, 308, 310, 309, 312,
    301, 308, 300, 300, 300, 306, 314, 312, 313, 311,
    313, 311, 305, 302, 305, 313, 315, 312, 311, 314,
    314, 314, 315, 351, 353, 351, 353, 351, 351, 353,
    353
  ];

  return (
    <Svg width={width} height={400} viewBox={`0 0 ${width} 400`}>
      <Defs>
        <Filter id="blurFilter">
          <FeOffset />
          <FeGaussianBlur stdDeviation="1.5" />
          <FeFlood floodOpacity="0.161" />
          <FeComposite operator="in" in2="SourceAlpha" />
          <FeComposite in="SourceGraphic" />
        </Filter>
      </Defs>

      {/* Grupo principal de líneas */}
      <G transform="translate(0, 0)" opacity="0.4">
        {/* Líneas principales */}
        <G stroke="#e3b867" strokeLinecap="round" strokeWidth="2">
          {heights.map((height, index) => (
            <Line key={`line-${index}`} x1={index * lineSpacing} y1="0" x2={index * lineSpacing} y2={height} />
          ))}
        </G>

        {/* Versión difuminada */}
        <G filter="url(#blurFilter)" stroke="rgba(227,184,103,0.69)" strokeLinecap="round" strokeWidth="2">
          {heights.map((height, index) => (
            <Line key={`blurred-line-${index}`} x1={index * lineSpacing} y1="0" x2={index * lineSpacing} y2={height} />
          ))}
        </G>
      </G>
    </Svg>
  );
};

export default LinesSVG;
