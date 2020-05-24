/*******************************************************************************
This file is part of Shellfish-3D.
Copyright (c) 2020 Martin Grimme <martin.grimme@gmail.com>

Permission is hereby granted, free of charge, to any person obtaining a copy of
this software and associated documentation files (the "Software"), to deal in
the Software without restriction, including without limitation the rights to
use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of
the Software, and to permit persons to whom the Software is furnished to do so,
subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS
FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR
COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER
IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN
CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
*******************************************************************************/

"use strict";

shRequire([__dirname + "/entity.js", __dirname + "/util/m4.js"], (entity, m4) =>
{
    const d = new WeakMap();

    exports.Group = class Group extends entity.Entity
    {
        constructor()
        {
            super();
            d.set(this, {
                
            });
        }

        prepareScene(om, sceneInfo)
        {
            const matrix = m4.multiply(om, this.matrix);
            this.children.filter(c => c.prepareScene && c.visible).forEach((obj) =>
            {
                obj.prepareScene(matrix, sceneInfo);
            });
        }

        renderScene(gl, om, sceneInfo)
        {
            const matrix = m4.multiply(om, this.matrix);
            this.children.filter(c => c.renderScene && c.visible).forEach((obj) =>
            {
                obj.renderScene(gl, matrix, sceneInfo);
            });
        }

        add(child)
        {
            child.parent = this;
            child.connect("invalidate", this, () => { this.invalidate(); });
        }
    };
});