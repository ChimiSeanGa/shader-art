import { glslComplex, complexParser } from "../../util/glsl-complex";
import { glslColor } from "../../util/glsl-color";

const sketch = (p) => {
   let uExp = 2; // exponent of Julia set function
   let uCst = [0.0, 0.0]; // vector representing complex constant of function
   let slider = null;
   let sliderLabel = null;

   let wrapper = null;
   let cnv = null;

   let sh = null;

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
      uniform vec2 uExp; // exponent of Julia set function
      uniform vec2 uCst; // constant term of Julia set function
      
      #define PI 3.14159265359
      #define MAXMOD 4.0
      #define MAXITERS 15
      
      ${glslComplex}
      ${glslColor}

      // Color is determined by point on rgb color circle
      vec3 getColor(float t) {
         // Circle is centered at p, and its axes are given by v1, v2
         // Radius is given by r
         vec3 p = vec3(0.5);
         vec3 v1 = vec3(0.9, 0.2, 0.3);
         vec3 v2 = vec3(-0.5, -0.1, -0.8);
         float r = 0.5;

         // Apply Gram-Schmidt to get orthonormal vectors
         v2 = v2 - dot(v2,v1)/dot(v1,v1)*v1;
         v1 = v1/length(v1);
         v2 = v2/length(v2);

         return rgbCircle(p, v1, v2, r, t);
      }

      vec3 iterateFun(vec2 z, vec2 c) {
         vec3 col = vec3(0.0, 1.0, 0.0);
         vec2 z0 = vec2(z.x, z.y);
         for (int i = 0; i < MAXITERS; i++) {
            if (cx_modulus(z0) > MAXMOD) {
               float t = float(i)/float(MAXITERS)*2.0*PI;
               col = getColor(t);
               break;
            } else {
               z0 = cx_add(cx_pow(z0, uExp), c);
            }

            if (i+1 == MAXITERS) {
               col = vec3(0.0);
            }
         }

         return col;
      }

      void main() {
         vec2 st = gl_FragCoord.xy/uResolution;
         vec2 z = (st - vec2(0.5, 0.5)) * 4.0;
         vec2 c = (uCst/uResolution - vec2(0.5, 0.5)) * 4.0;

         vec3 rgb_color = iterateFun(z, c);
         gl_FragColor = vec4(rgb_color, 1.0);
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
      sliderLabel.position(0, p.height+10, "static");
   }

   p.setup = () => {
      wrapper = document.getElementById("p5Wrapper");
      cnv = p.createCanvas(wrapper.offsetWidth, wrapper.offsetWidth, p.WEBGL);
      p.pixelDensity(1);

      sh = p.createShader(vs, fs());
      p.shader(sh);
      p.noStroke();

      uCst = [p.width/3.0, p.height/3.0];

      sh.setUniform("uResolution", [p.width, p.height]);
      sh.setUniform("uExp", [uExp, 0]);
      sh.setUniform("uCst", uCst);

      // Slider to change the exponent of the Julia set function
      slider = p.createSlider(2, 7, 2, 1);
      // slider.position(p.width/2.0 + slider.width/2.0, p.height + 10, "static");
      slider.size(80);
      slider.input(() => {
         uExp = slider.value();
      });
      sliderLabel = p.createDiv('Exponent:');
      sliderLabel.position(0, p.height + 10, "static");
      sliderLabel.style('display', 'flex');
      sliderLabel.style('gap', '10px');
      sliderLabel.style('flex-direction', 'row');
      sliderLabel.style('justify-content', 'center');
      sliderLabel.style('align-items', 'center');
      slider.parent(sliderLabel);
   };

   p.draw = () => {
      // Mouse hover changes constant of Julia set function
      if (p.mouseX >= 0 && p.mouseX <= p.width
         && p.mouseY >= 0 && p.mouseY <= p.height) {
         uCst = [p.mouseX, p.height-p.mouseY];
      }

      sh.setUniform("uResolution", [p.width, p.height]);
      sh.setUniform("uExp", [uExp, 0]);
      sh.setUniform("uCst", uCst);
      p.plane(p.width, p.height);
   };
};

export default sketch;
