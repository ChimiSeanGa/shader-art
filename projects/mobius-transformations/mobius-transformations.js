import { glslComplex, complexParser } from "../../util/glsl-complex";
import { create, all } from 'mathjs';

const sketch = (p) => {
   let inp = null;
   let button = null;

   let wrapper = null;

   let sh = null;

   const math = create(all, {});

   const S = math.matrix([
      [math.complex(0), math.complex(-1)],
      [math.complex(1), math.complex(0)]
   ]);

   const T = math.matrix([
      [math.complex(1), math.complex(1)],
      [math.complex(0), math.complex(1)]
   ]);

   const id = math.matrix([
      [math.complex(1), math.complex(0)],
      [math.complex(0), math.complex(1)]
   ]);

   // const mat = math.multiply(S, T);
   const mat = S;
   // const mat = T;
   // const mat = id;
   
   const period = 2;

   // Calculate the transition matrix between the identity and inv(mat).
   const tmat = (t) => {
      const modt = math.mod(t, 1);
      const phase = math.floor(math.mod(t, period));

      return math.add(
         math.multiply(1-modt, math.pow(mat, -phase)),
         math.multiply(modt, math.pow(mat, -(phase+1)))
      );
   }

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

      // Initial matrix coefficients for the computed transformation
      // This should ultimately be the inverse of the above transformation
      // at some time t
      uniform vec2 uMata;
      uniform vec2 uMatb;
      uniform vec2 uMatc;
      uniform vec2 uMatd;
      
      #define PI 3.14159265359
      
      ${glslComplex}

      vec3 rgb2hsv(vec3 c) {
         vec4 K = vec4(0.0, -1.0/3.0, 2.0/3.0, -1.0);
         vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
         vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

         float d = q.x - min(q.w, q.y);
         float e = 1.0e-10;
         return vec3(abs(q.z+(q.w-q.y)/(6.0*d+e)), d/(q.x+e), q.x);
      }

      vec3 hsv2rgb(vec3 c) {
         vec4 K = vec4(1.0, 2.0/3.0, 1.0/3.0, 3.0);
         vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
         return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
      }
      
      vec3 complexToHsv(vec2 z) {
         //return vec3(cx_arg(z)/(2.0*PI), 1.0, 2.0/PI*atan(cx_modulus(z)));
         return vec3(cx_arg(z)/(2.0*PI), 1.0, 1.0);
      }

      // Checkerboard pattern for complex plane
      vec3 checker(vec2 z) {
         float s1 = floor(mod(z.x, 2.0));
         float s2 = floor(mod(z.y, 2.0));
         if (s1 == s2) {
            return vec3(1.0, 0.0, 1.0);
         } else {
            return vec3(0.0, 0.0, 1.0);
         }
      }

      // Split checkerboard. Each square is made of two triangles
      vec3 splitChecker(vec2 z) {
         float s1 = floor(mod(z.x, 2.0));
         float s2 = floor(mod(z.y, 2.0));

         float t1 = mod(z.x, 1.0);
         float t2 = mod(z.y, 1.0);

         if (s1 == s2 && t1 >= t2) {
            return vec3(0.0, 0.3, 0.0);
         } else if (s1 == s2 && t1 < t2) {
            return vec3(0.0, 0.45, 0.0);
         } else if (s1 != s2 && -t1 + 1.0 >= t2) {
            return vec3(0.0, 0.75, 0.0);
         } else if (s1 != s2 && -t1 + 1.0 < t2) {
            return vec3(0.0, 0.9, 0.0);
         }
      }

      // Like split checker but with more colors
      vec3 splitRainbowChecker(vec2 z) {
         float s1 = floor(mod(z.x, 2.0));
         float s2 = floor(mod(z.y, 2.0));

         float t1 = mod(z.x, 1.0);
         float t2 = mod(z.y, 1.0);

         if (s1 == s2 && t1 >= t2) {
            return hsv2rgb(complexToHsv(cx_add(z, vec2(1.0, 0.0))));
         } else if (s1 == s2 && t1 < t2) {
            return hsv2rgb(complexToHsv(cx_add(z, vec2(0.0, 1.0))));
         } else if (s1 != s2 && -t1 + 1.0 >= t2) {
            return hsv2rgb(complexToHsv(cx_add(z, vec2(-1.0, 0.0))));
         } else if (s1 != s2 && -t1 + 1.0 < t2) {
            return hsv2rgb(complexToHsv(cx_add(z, vec2(0.0, -1.0))));
         }
      }

      // Apply the 2x2 matrix given by the above coefficients tx as a
      // fractional linear transformation on the complex number z
      vec2 mobius(vec2 z) {
         return cx_div(
            cx_add(cx_mul(uMata, z), uMatb),
            cx_add(cx_mul(uMatc, z), uMatd)
         );
      }

      void main() {
         vec2 st = gl_FragCoord.xy/uResolution;
         vec2 z = (st - vec2(0.5, 0.5)) * 4.0;

         vec2 fz = mobius(z);

         // vec3 hsv_color = complexToHsv(fz);
         // gl_FragColor = vec4(hsv2rgb(hsv_color), 1.0);

         gl_FragColor = vec4(splitChecker(fz), 1.0);
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
      // inp.position(p.width/2.0 + inp.width/2.0, p.height + 10, "static");
      // button.position(inp.width + inp.x, p.height + 10, "static");
   }

   p.setup = () => {
      wrapper = document.getElementById("p5Wrapper");
      p.createCanvas(wrapper.offsetWidth, wrapper.offsetWidth, p.WEBGL);
      p.pixelDensity(1);

      sh = p.createShader(vs, fs());
      p.shader(sh);
      p.noStroke();

      sh.setUniform("uResolution", [p.width, p.height]);
      sh.setUniform("uMata", [1,0]);
      sh.setUniform("uMatb", [0,0]);
      sh.setUniform("uMatc", [0,0]);
      sh.setUniform("uMatd", [1,0]);

      // inp = p.createInput("z");
      // inp.position(p.width/2.0 + inp.width/2.0, p.height + 10, "static");

      // button = p.createButton("Generate");
      // button.mousePressed(() => {
      //    let inpStr = inp.value();
      //    funStr = complexParser(inpStr);
      //    console.log(funStr);
      //    if (funStr) {
      //       let newSh = p.createShader(vs, fs());
      //       let shaderError = checkShaderError(sh, fs());
      //       if (shaderError) {
      //          alert(shaderError);
      //       } else {
      //          sh = newSh;
      //          p.shader(sh);
      //       }
      //    } else {
      //       alert("Invalid complex equation");
      //    }
      // });
      // button.position(inp.width + inp.x, p.height + 10, "static");

      // p.saveGif('mobius.gif', 400, { units: 'frames' });
   };

   p.draw = () => {
      sh.setUniform("uResolution", [p.width, p.height]);

      const transMat = tmat(p.frameCount/150.0);

      sh.setUniform("uMata", math.subset(transMat,math.index(0,0)).toVector());
      sh.setUniform("uMatb", math.subset(transMat,math.index(0,1)).toVector());
      sh.setUniform("uMatc", math.subset(transMat,math.index(1,0)).toVector());
      sh.setUniform("uMatd", math.subset(transMat,math.index(1,1)).toVector());
      p.plane(p.width, p.height);
   };
};

export default sketch;
