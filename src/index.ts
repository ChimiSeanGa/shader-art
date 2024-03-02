import * as p5 from 'p5';
import sketch from '../projects/domain-coloring/domain-coloring';
// import sketch from '../projects/piecewise-symmetry/piecewise-symmetry';
// import sketch from '../projects/mobius-transformations/mobius-transformations';
// import sketch from '../projects/julia-sets/julia-sets';

export const myp5 = new p5(sketch, document.getElementById("p5Wrapper"));