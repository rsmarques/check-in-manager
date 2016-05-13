<?php

namespace App\Http\Controllers;

class ViewController extends Controller
{
    // Serving angular webapp
    public function home()
    {
        return view('index');
    }
}
