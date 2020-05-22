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

const DEG_TO_RAD = Math.PI / 180;

exports.multiply = function (m1, m2)
{
    const res = [];
    const m1Rows = 4;
    const m2Cols = 4;

    for (let row = 0; row < m1Rows; ++row)
    {
        for (let col = 0; col < m2Cols; ++col)
        {
            let v = 0.0;
            for (let i = 0; i < 4; ++i)
            {
                v += m2[row * 4 + i] * m1[i * 4 + col];
            }
            res.push(v);
        }
    }

    return res;
};

exports.translation = function (tx, ty, tz)
{
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        tx, ty, tz, 1
    ];
};

exports.xRotation = function (angle)
{
    const rad = angle * DEG_TO_RAD;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    return [
        1, 0, 0, 0,
        0, c, s, 0,
        0, -s, c, 0,
        0, 0, 0, 1
    ];
};

exports.yRotation = function (angle)
{
    const rad = angle * DEG_TO_RAD;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    return [
        c, 0, -s, 0,
        0, 1, 0, 0,
        s, 0, c, 0,
        0, 0, 0, 1
    ];   
}

exports.zRotation = function (angle)
{
    const rad = angle * DEG_TO_RAD;
    const c = Math.cos(rad);
    const s = Math.sin(rad);

    return [
        c, s, 0, 0,
        -s, c, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

exports.rotation = function (rx, ry, rz)
{
    return exports.multiply(
        exports.multiply(
            exports.xRotation(rx),
            exports.yRotation(ry)
        ),
        exports.zRotation(rz)
    );
}

exports.scaling = function (sx, sy, sz)
{
    return [
        sx, 0, 0, 0,
        0, sy, 0, 0,
        0, 0, sz, 0,
        0, 0, 0, 1
    ];
};

exports.orthographic = function (left, right, bottom, top, near, far)
{
    return [
        2 / (right - left), 0, 0, 0,
        0, 2 / (top - bottom), 0, 0,
        0, 0, 2 / (near - far), 0,
        (left + right) / (left - right), (bottom + top) / (bottom - top), (near + far) / (near - far), 1
    ];
};

exports.frustum = function (l, r, b, t, n, f)
{
    return [
        2 * n / (r - l), 0, (r + l) / (r - l), 0,
        0, 2 * n / (t - b), (t + b) / (t - b), 0,
        0, 0, -(f + n) / (f - n), -2 * f * n / (f - n),
        0, 0, -1, 0
    ];
};

exports.perspective = function (fov, aspect, near, far)
{
    const y = Math.tan(fov * Math.PI / 360) * near;
    const x = y * aspect;
    return exports.frustum(-x, x, -y, y, near, far);
};
