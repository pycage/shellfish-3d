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

exports.PLUS = (a, b) => a + b;
exports.MINUS = (a, b) => a - b;

exports.makeSurface = function (vs, indexes)
{
    let res = [];
    indexes.forEach((idx) =>
    {
        res = res.concat(vs[idx]);
    });
    return res;
}

exports.makeRectSurface = function (vs, v1, v2, v3, v4)
{
    return exports.makeSurface(vs, [v4, v3, v1, v1, v3, v2]);
}

exports.surfaceNormal = function (v1, v2, v3)
{
    const u = exports.elementWise(v2, v1, exports.MINUS);
    const v = exports.elementWise(v3, v1, exports.MINUS);

    return [
        u[1] * v[2] - u[2] * v[1],
        u[2] * v[0] - u[0] * v[2],
        u[0] * v[1] - u[1] * v[0]
    ];
};

exports.surfaceTangent = function (v1, v2, v3, uv1, uv2, uv3)
{
    const e1 = exports.elementWise(v2, v1, exports.MINUS);
    const e2 = exports.elementWise(v3, v1, exports.MINUS);
    const deltaUv1 = exports.elementWise(uv2, uv1, exports.MINUS);
    const deltaUv2 = exports.elementWise(uv3, uv1, exports.MINUS);

    /*
    console.log("v1: " + JSON.stringify(v1));
    console.log("v2: " + JSON.stringify(v2));
    console.log("v3: " + JSON.stringify(v3));

    console.log("e1: " + JSON.stringify(e1));
    console.log("e2: " + JSON.stringify(e2));

    console.log("uv1: " + JSON.stringify(uv1));
    console.log("uv2: " + JSON.stringify(uv2));
    console.log("uv3: " + JSON.stringify(uv3));
    
    console.log("deltaUv1: " + JSON.stringify(deltaUv1));
    console.log("deltaUv2: " + JSON.stringify(deltaUv2));
    */

    let f = 0.0;
    let t = (deltaUv1[0] * deltaUv2[1] - deltaUv2[0] * deltaUv1[1]);
    if (t !== 0)
    {
        f = 1.0 / (deltaUv1[0] * deltaUv2[1] - deltaUv2[0] * deltaUv1[1]);
    }
    /*
    console.log("v: " + JSON.stringify([v1, v2, v3]) + ", t: " + JSON.stringify([uv1, uv2,uv3]) +
    ", duv1: " + JSON.stringify(deltaUv1) + ", duv2: " + JSON.stringify(deltaUv2) +
    " -> tangent: " + JSON.stringify([
        f * (deltaUv2[1] * e1[0] - deltaUv1[1] * e2[0]),
        f * (deltaUv2[1] * e1[1] - deltaUv1[1] * e2[1]),
        f * (deltaUv2[1] * e1[2] - deltaUv1[1] * e2[2])
    ]));
    */
    return [
        f * (deltaUv2[1] * e1[0] - deltaUv1[1] * e2[0]),
        f * (deltaUv2[1] * e1[1] - deltaUv1[1] * e2[1]),
        f * (deltaUv2[1] * e1[2] - deltaUv1[1] * e2[2])
    ];

};

exports.elementWise = function (v1, v2, op)
{
    return v1.map((a, idx) => op(a, v2[idx]));
};