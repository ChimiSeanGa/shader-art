import { glslComplex, complexParser } from "../../util/glsl-complex";
import { glslColor } from "../../util/glsl-color";
import { evaluate, compile, distance } from "mathjs";

const sketch = (p) => {
   let funStr = "z";
   let zoomFactor = 1.0;
   let center = [0, 0];

   let inp = null;
   let button = null;

   let wrapper = null;

   let sh = null;
   let cnv = null;

   let touchStartCoords = null;
   let initialPinchDist = null;

   let vs = `
      precision highp float;
      uniform mat4 uModelViewMatrix;
      uniform mat4 uProjectionMatrix;
      
      attribute vec3 aPosition;
      attribute vec2 aTexCoord;
      varying vec2 vTexCoord;
      
      void main() {
         vTexCoord = aTexCoord;
         vec4 positionVec4 = vec4(aPosition, 1.0);
         gl_Position = uProjectionMatrix * uModelViewMatrix * positionVec4;
      }
   `;

   const fs = () => `
      precision highp float;
      
      uniform vec2 uResolution;
      uniform float uZoom;
      uniform vec2 uCenter;
      
      #define PI 3.14159265359
      
      ${glslComplex}
      ${glslColor}
      
      vec3 complexToHsv(vec2 z) {
         //return vec3(cx_arg(z)/(2.0*PI), 1.0, 2.0/PI*atan(cx_modulus(z)));
         return vec3(cx_arg(z)/(2.0*PI), 1.0, 1.0);
      }

      void main() {
         vec2 st = gl_FragCoord.xy/uResolution;
         vec2 z = (st - vec2(0.5, 0.5)) * 4.0 * uZoom - (uCenter/uResolution*4.0);

         vec2 fz = ${funStr};

         vec3 hsv_color = complexToHsv(fz);
         gl_FragColor = vec4(hsv2rgb(hsv_color), 1.0);
      }
   `;

   const checkShaderError = (shaderObj, shaderText) => {
      let gl = shaderObj._renderer.GL;
      let glFragShader = gl.createShader(gl.FRAGMENT_SHADER);
      gl.shaderSource(glFragShader, shaderText);
      gl.compileShader(glFragShader);
      if (!gl.getShaderParameter(glFragShader, gl.COMPILE_STATUS)) {
         return gl.getShaderInfoLog(glFragShader);
      }
      return null;
   }

   p.windowResized = () => {
      wrapper = document.getElementById("p5Wrapper");
      p.resizeCanvas(wrapper.offsetWidth, wrapper.offsetWidth);
      inp.position(p.width/2.0 + inp.width/2.0, p.height + 10, "static");
      button.position(inp.width + inp.x, p.height + 10, "static");
   }

   p.setup = () => {
      wrapper = document.getElementById("p5Wrapper");
      cnv = p.createCanvas(wrapper.offsetWidth, wrapper.offsetWidth, p.WEBGL);
      p.pixelDensity(1);

      sh = p.createShader(vs, fs());
      p.shader(sh);
      p.noStroke();

      sh.setUniform("uResolution", [p.width, p.height]);
      sh.setUniform("uZoom", zoomFactor);
      sh.setUniform("uCenter", center);

      inp = p.createInput("z");
      inp.position(p.width/2.0 + inp.width/2.0, p.height + 10, "static");

      button = p.createButton("Generate");
      button.mousePressed(() => {
         let inpStr = inp.value();
         funStr = complexParser(inpStr);
         if (funStr) {
            let newSh = p.createShader(vs, fs());
            let shaderError = checkShaderError(sh, fs());
            if (shaderError) {
               alert(shaderError);
            } else {
               sh = newSh;
               p.shader(sh);
            }
         } else {
            alert("Invalid complex equation");
         }
      });
      button.position(inp.width + inp.x, p.height + 10, "static");

      cnv.mouseWheel((event) => {
         if (event.deltaY < 0) {
            zoomFactor *= 0.9;
         } else if (event.deltaY > 0) {
            zoomFactor *= 1.1;
         }
      });
   };

   p.mouseDragged = (event) => {
      if (event.srcElement === cnv.elt) {
         center[0] += event.movementX * zoomFactor;
         center[1] -= event.movementY * zoomFactor;
      }
   }

   p.touchStarted = (event) => {
      if (!event.touches) {
         p.mouseDragged(event);
      } else if (event.touches.length >= 2) {
         initialPinchDist = distance(
            [event.touches[0].clientX, event.touches[0].clientY],
            [event.touches[1].clientX, event.touches[1].clientY]
         );
      } else if (event.touches.length == 1) {
         touchStartCoords = [p.mouseX, p.mouseY];
      }
   }

   p.touchMoved = (event) => {
      if (event.touches.length >= 2 && initialPinchDist) {
         let currentPinchDist = distance(
            [event.touches[0].clientX, event.touches[0].clientY],
            [event.touches[1].clientX, event.touches[1].clientY]
         );
         zoomFactor *= initialPinchDist/currentPinchDist;
         initialPinchDist = currentPinchDist;
      } else if (event.touches.length == 1 && touchStartCoords) {
         center[0] += (p.mouseX - touchStartCoords[0]) * zoomFactor;
         center[1] -= (p.mouseY - touchStartCoords[1]) * zoomFactor;
         touchStartCoords = [p.mouseX, p.mouseY];
      }
      return false;
   }

   p.touchEnded = () => {
      touchStartCoords = null;
   }

   p.draw = () => {
      sh.setUniform("uResolution", [p.width, p.height]);
      sh.setUniform("uZoom", zoomFactor);
      sh.setUniform("uCenter", center);
      p.plane(p.width, p.height);
   };
};

export default sketch;
