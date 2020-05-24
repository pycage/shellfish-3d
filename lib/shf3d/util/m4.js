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

exports.identity = function()
{
    return [
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    ];
};

exports.transpose = function (m)
{
    const t = exports.identity();
    for (let row = 0; row < 4; ++row)
    {
        for (let col = 0; col < 4; ++col)
        {
            t[row * 4 + col] = m[col * 4 + row];
        }
    }
    return t;
}

exports.multiply = function (m1, m2)
{
    const res = exports.identity();
    const m1Rows = 4;
    const m2Cols = 4;

    for (let row = 0; row < m1Rows; ++row)
    {
        for (let col = 0; col < m2Cols; ++col)
        {
            res[row * 4 + col] = 0.0;
            for (let i = 0; i < 4; ++i)
            {
                //res[row * 4 + col] += m2[row * 4 + i] * m1[i * 4 + col];
                res[row * 4 + col] += m1[row * 4 + i] * m2[i * 4 + col];
            }
        }
    }

    return res;
};

exports.multiplyVector = function (m1, m2)
{
    const res = [0, 0, 0, 0];
    const m1Rows = 4;
    const m2Cols = 1;

    for (let row = 0; row < m1Rows; ++row)
    {
        for (let col = 0; col < m2Cols; ++col)
        {
            res[row * 1 + col] = 0.0;
            for (let i = 0; i < 4; ++i)
            {
                res[row * 1 + col] += m1[row * 4 + i] * m2[i * 4 + col];
            }
        }
    }

    return res;

}

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

exports.inverse = function (m)
{
    const mdet = exports.identity();

    mdet[0] = m[5] * m[10] * m[15] -
              m[5] * m[11] * m[14] -
              m[9] * m[6] * m[15] +
              m[9] * m[7] * m[14] +
              m[13] * m[6] * m[11] -
              m[13] * m[7] * m[10];
    mdet[4] = -m[4] * m[10] * m[15] +
              m[4] * m[11] * m[14] +
              m[8] * m[6] * m[15] -
              m[8] * m[7] * m[14] -
              m[12] * m[6] * m[11] +
              m[12] * m[7] * m[10];
    mdet[8] = m[4] * m[9] * m[15] -
              m[4] * m[11] * m[13] -
              m[8] * m[5] * m[15] +
              m[8] * m[7] * m[13] +
              m[12] * m[5] * m[11] -
              m[12] * m[7] * m[9];
    mdet[12]= -m[4] * m[9] * m[14] +
              m[4] * m[10] * m[13] +
              m[8] * m[5] * m[14] -
              m[8] * m[6] * m[13] -
              m[12] * m[5] * m[10] + 
              m[12] * m[6] * m[9];
    mdet[1] = -m[1] * m[10] * m[15] +
              m[1] * m[11] * m[14] +
              m[9] * m[2] * m[15] -
              m[9] * m[3] * m[14] -
              m[13] * m[2] * m[11] +
              m[13] * m[3] * m[10];
    mdet[5] = m[0] * m[10] * m[15] -
              m[0] * m[11] * m[14] -
              m[8] * m[2] * m[15] +
              m[8] * m[3] * m[14] +
              m[12] * m[2] * m[11] -
              m[12] * m[3] * m[10];
    mdet[9] = -m[0] * m[9] * m[15] +
              m[0] * m[11] * m[13] +
              m[8] * m[1] * m[15] -
              m[8] * m[3] * m[13] -
              m[12] * m[1] * m[11] +
              m[12] * m[3] * m[9];
    mdet[13]= m[0] * m[9] * m[14] -
              m[0] * m[10] * m[13] - 
              m[8] * m[1] * m[14] +
              m[8] * m[2] * m[13] +
              m[12] * m[1] * m[10] -
              m[12] * m[2] * m[9];
    mdet[2] = m[1] * m[6] * m[15] -
              m[1] * m[7] * m[14] -
              m[5] * m[2] * m[15] +
              m[5] * m[3] * m[14] +
              m[13] * m[2] * m[7 ]-
              m[13] * m[3] * m[6];
    mdet[6] = -m[0] * m[6] * m[15] +
              m[0] * m[7] * m[14] +
              m[4] * m[2] * m[15] -
              m[4] * m[3] * m[14] -
              m[12] * m[2] * m[7] +
              m[12] * m[3] * m[6];
    mdet[10] = m[0] * m[5] * m[15] -
               m[0] * m[7] * m[13] -
               m[4] * m[1] * m[15] +
               m[4] * m[3] * m[13] +
               m[12] * m[1] * m[7]
               -m[12] * m[3] * m[5];
    mdet[14]= -m[0] * m[5] * m[14] +
              m[0] * m[6] * m[13] +
              m[4] * m[1] * m[14] -
              m[4] * m[2] * m[13] -
              m[12] * m[1] * m[6] +
              m[12] * m[2] * m[5];
    mdet[3] = -m[1] * m[6] * m[11] +
              m[1] * m[7] * m[10] +
              m[5] * m[2] * m[11] -
              m[5] * m[3] * m[10] -
              m[9] * m[2] * m[7] +
              m[9] * m[3] * m[6];
    mdet[7] = m[0] * m[6] * m[11] -
              m[0] * m[7] * m[10] -
              m[4] * m[2] * m[11] +
              m[4] * m[3] * m[10] +
              m[8] * m[2] * m[7] -
              m[8] * m[3] * m[6];
    mdet[11]= -m[0] * m[5] * m[11] +
              m[0] * m[7] * m[9] +
              m[4] * m[1] * m[11] -
              m[4] * m[3] * m[9] -
              m[8] * m[1] * m[7] +
              m[8] * m[3] * m[5];
    mdet[15]= m[0] * m[5] * m[10] -
              m[0] * m[6] * m[9] -
              m[4] * m[1] * m[10] +
              m[4] * m[2] * m[9] +
              m[8] * m[1] * m[6] -
              m[8] * m[2] * m[5];

             
    const det = m[0] * mdet[0] +
                m[1] * mdet[4] +
                m[2] * mdet[8] +
                m[3] * mdet[12];

    if (det === 0)
    {
        return identity;
    }
    else
    {
        const inverse = exports.identity();
        const invDet = 1.0 / det;
        for (let i = 0; i < 16; i++)
        {
            inverse[i] = mdet[i] * invDet;
        }
        return inverse;
    }
}

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
