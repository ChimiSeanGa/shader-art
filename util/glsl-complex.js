import { parse } from 'mathjs';

export const glslComplex = `
   // Hyperboloc functions by toneburst from 
   // https://machinesdontcare.wordpress.com/2008/03/10/glsl-cosh-sinh-tanh/
   // These are missing in GLSL 1.10 and 1.20, uncomment if you need them 
   
   /// COSH Function (Hyperbolic Cosine)
   float cosh(float val) {
      float tmp = exp(val);
      float cosH = (tmp + 1.0 / tmp) / 2.0;
      return cosH;
   }
    
   // TANH Function (Hyperbolic Tangent)
   float tanh(float val) {
      float tmp = exp(val);
      float tanH = (tmp - 1.0 / tmp) / (tmp + 1.0 / tmp);
      return tanH;
   }
    
   // SINH Function (Hyperbolic Sine)
   float sinh(float val) {
      float tmp = exp(val);
      float sinH = (tmp - 1.0 / tmp) / 2.0;
      return sinH;
   }
   
   // Complex Number math by julesb
   // https://github.com/julesb/glsl-util
   // Additions by Johan Karlsson (DonKarlssonSan)
   
   vec2 cx_add(vec2 a, vec2 b) {
      return vec2(a.x + b.x, a.y + b.y);
   }
   
   vec2 cx_sub(vec2 a, vec2 b){
      return vec2(a.x - b.x, a.y - b.y);
   }
   
   vec2 cx_unary_minus(vec2 a) {
      return -a;
   }
   
   vec2 cx_mul(vec2 a, vec2 b) {
      return vec2(a.x*b.x-a.y*b.y, a.x*b.y+a.y*b.x);
   }
   
   vec2 cx_div(vec2 a, vec2 b) {
      return vec2(((a.x*b.x+a.y*b.y)/(b.x*b.x+b.y*b.y)),((a.y*b.x-a.x*b.y)/(b.x*b.x+b.y*b.y)));
   }
   
   float cx_modulus(vec2 a) {
      return length(a);
   }
   
   vec2 cx_conj(vec2 a) {
      return vec2(a.x, -a.y);
   }
   
   float cx_arg(vec2 a) {
      if (a.x == 0.0) {
         if (a.y >= 0.0) {
            return 1.57079632;
         }
         return -1.57079632;
      }
      return atan(a.y, a.x);
   }
   
   vec2 cx_sin(vec2 a) {
      return vec2(sin(a.x) * cosh(a.y), cos(a.x) * sinh(a.y));
   }
   
   vec2 cx_cos(vec2 a) {
      return vec2(cos(a.x) * cosh(a.y), -sin(a.x) * sinh(a.y));
   }
   
   vec2 cx_sqrt(vec2 a) {
      float r = length(a);
      float rpart = sqrt(0.5*(r+a.x));
      float ipart = sqrt(0.5*(r-a.x));
      if (a.y < 0.0) ipart = -ipart;
      return vec2(rpart,ipart);
   }
   
   vec2 cx_tan(vec2 a) {return cx_div(cx_sin(a), cx_cos(a)); }
   
   vec2 cx_log(vec2 a) {
      float rpart = sqrt((a.x*a.x)+(a.y*a.y));
      float ipart = atan(a.y,a.x);
      if (ipart > PI) ipart=ipart-(2.0*PI);
      return vec2(log(rpart),ipart);
   }
   
   vec2 cx_mobius(vec2 a) {
      vec2 c1 = a - vec2(1.0,0.0);
      vec2 c2 = a + vec2(1.0,0.0);
      return cx_div(c1, c2);
   }
   
   vec2 cx_z_plus_one_over_z(vec2 a) {
      return a + cx_div(vec2(1.0,0.0), a);
   }
   
   vec2 cx_z_squared_plus_c(vec2 z, vec2 c) {
      return cx_mul(z, z) + c;
   }
   
   vec2 cx_sin_of_one_over_z(vec2 z) {
      return cx_sin(cx_div(vec2(1.0,0.0), z));
   }
   
   ////////////////////////////////////////////////////////////
   // end Complex Number math by julesb
   ////////////////////////////////////////////////////////////
   
   // My own additions to complex number math
   vec2 cx_to_polar(vec2 a) {
      float phi = atan(a.y / a.x);
      float r = length(a);
      return vec2(r, phi); 
   }
       
   // Complex power
   vec2 cx_pow(vec2 a, vec2 b) {
      float angle = atan(a.y, a.x);
      float r = length(a);
      float real = pow(r, b.x) * exp(-b.y*angle) * cos(b.x*angle + b.y*log(r));
      float im = pow(r, b.x) * exp(-b.y*angle) * sin(b.x*angle + b.y*log(r));
      return vec2(real, im);
   }
`;

const complexInterpreter = (node) => {
   switch(node.type) {
      case "OperatorNode":
         // Recursively get list of interpreted arguments
         let opInner = "";
         for (let i = 0; i < node.args.length; i++) {
            let recResult = complexInterpreter(node.args[i]);
            if (recResult) {
               opInner += recResult + ",";
            } else {
               return null;
            }
         }
         // Remove last extraneous comma
         opInner = opInner.slice(0, -1);

         if (node.fn === "add") {
            return "cx_add(" + opInner + ")";
         } else if (node.fn === "subtract") {
            return "cx_sub(" + opInner + ")";
         } else if (node.fn === "unaryMinus") {
            return "cx_unary_minus(" + opInner + ")";
         } else if (node.fn === "multiply") {
            return "cx_mul(" + opInner + ")";
         } else if (node.fn === "divide") {
            return "cx_div(" + opInner + ")";
         } else if (node.fn === "pow") {
            return "cx_pow(" + opInner + ")";
         } else {
            return null;
         }
      case "ConstantNode":
         return "vec2(" + node.value.toFixed(5) + ",0.0)";
      case "SymbolNode":
         if (node.name === "z") {
            return node.name;
         } else if (node.name === "i") {
            return "vec2(0.0,1.0)";
         } else if (node.name === "pi") {
            return "vec2(3.14159265359,0.0)";
         } else {
            return null;
         }
      case "FunctionNode":
         // Recursively get list of interpreted arguments
         let funInner = "";
         for (let i = 0; i < node.args.length; i++) {
            let recResult = complexInterpreter(node.args[i]);
            if (recResult) {
               funInner += recResult + ",";
            } else {
               return null;
            }
         }
         // Remove last extraneous comma
         funInner = funInner.slice(0, -1);

         if (node.fn.name === "sin") {
            return "cx_sin(" + funInner + ")";
         } else if (node.fn.name === "cos") {
            return "cx_cos(" + funInner + ")";
         } else if (node.fn.name === "tan") {
            return "cx_tan(" + funInner + ")";
         } else {
            return null;
         }
      case "ParenthesisNode":
         let parenInner = complexInterpreter(node.content);
         if (parenInner) {
            return "(" + complexInterpreter(node.content) + ")";
         } else {
            return null;
         }
      default:
         break;
   }
}

// Given a complex function string, generate GLSL function as a string
export const complexParser = (fun) => {
   // Get abstract syntax tree from mathjs
   const ast = parse(fun);
   console.log(ast);
   return complexInterpreter(ast);
}
