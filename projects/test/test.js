const sketch = (p) => {
   p.setup = () => {
      p.createCanvas(500, 500);
   };

   p.draw = () => {
      p.circle(250, 250, 100);
   };

   p.keyPressed = () => {
      if (p.key === 's') {
         p.saveGif('test.gif', 5);
      }
   }
};

export default sketch;
