<?php

namespace App\Http\Controllers;

// use League\Fractal\Resource\Collection;
use User;
use Social;

use JWTAuth;
use Response;

use Log;
use Validator;

use Illuminate\Http\Request;
use Illuminate\Http\Response as HttpResponse;

class UserController extends ApiController
{
    public function findBySlug($slug)
    {
        $user   = User::findBySlug($slug);

        if (empty($user)) {
            return $this->responseWithErrors("The requested user [$slug] does not exist.", 404);
        }

        return $this->respondWithArray(array("data" => $user));
    }

    public function signUp(Request $request)
    {
        $validator  = Validator::make($request->all(), [
            'email'         => 'required|email|max:255|unique:users',
            'password'      => 'required|min:6',
            'first_name'    => 'required',
            'slug'          => 'unique:users',
        ]);

        if ($validator->fails()) {
            return $this->responseWithErrors($validator->errors()->all(), 422);
        }

        $user               = new User;

        $user->email        = $request->input('email');
        $user->password     = $request->input('password');
        // $user->first_name   = $request->input('first_name');
        // $user->last_name    = $request->input('last_name', null);
        $user->slug         = $request->input('slug', $user->calcSlug());

        $user->save();

        $token              = JWTAuth::fromUser($user);

        return Response::json(compact('token'));
    }

    public function signIn(Request $request)
    {
        $credentials    = $request->only('email', 'password');

        if (!$token     = JWTAuth::attempt($credentials)) {
            return Response::json(false, HttpResponse::HTTP_UNAUTHORIZED);
        }

        return Response::json(compact('token'));
    }

    public function socialSignIn(Request $request)
    {
        $validator  = Validator::make($request->all(), [
            'name'          => 'required',
            'provider'      => 'required',
            'uid'           => 'required',
        ]);

        if ($validator->fails()) {
            return $this->responseWithErrors($validator->errors()->all(), 422);
        }

        $uid        = $request->input('uid');
        $provider   = $request->input('provider');

        $social     = Social::firstOrNew(array('uid' => $uid, 'provider' => $provider));

        if (empty($social->user_id)) {

            // Splitting name string into first_name and last_name
            $name               = $request->input('name');
            $firstName          = strrpos($name, ' ') ? substr($name, 0, strrpos($name, ' '))   : $name;
            $lastName           = strrpos($name, ' ') ? substr($name, strrpos($name, ' ') + 1)  : '';

            $email              = $request->input('email', "$uid@$provider");

            $user               = User::firstOrNew(array('email' => $email));
            $user->password     = $user->password   ? : $email;
            $user->first_name   = $user->first_name ? : $firstName;
            $user->last_name    = $user->last_name  ? : $lastName;
            $user->country      = $user->country    ? : $request->input('country', '--');
            $user->address      = $user->address    ? : $request->input('address', null);
            $user->slug         = $user->slug       ? : $user->calcSlug();

            $user->save();

            $social->user_id    = $user->id;

        } else {
            $user               = User::find($social->user_id);
        }

        $social->access_token   = $request->input('social_token', null);
        $social->save();

        $token                  = JWTAuth::fromUser($user);

        return Response::json(compact('token'));
    }

    public function me(Request $request)
    {
        return User::getAuthenticatedUser();
    }
}
