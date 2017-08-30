<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\Input;
// use League\Fractal\Resource\Collection;
use User;
use UserTransformer;

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

    // public function socialSignIn(Request $request)
    // {
    //     $validator  = Validator::make($request->all(), [
    //         'name'          => 'required',
    //         'provider'      => 'required',
    //         'uid'           => 'required',
    //     ]);

    //     if ($validator->fails()) {
    //         return $this->responseWithErrors($validator->errors()->all(), 422);
    //     }

    //     $uid        = $request->input('uid');
    //     $provider   = $request->input('provider');

    //     $social     = Social::firstOrNew(array('uid' => $uid, 'provider' => $provider));

    //     if (empty($social->user_id)) {

    //         // Splitting name string into first_name and last_name
    //         $name               = $request->input('name');
    //         $firstName          = strrpos($name, ' ') ? substr($name, 0, strrpos($name, ' '))   : $name;
    //         $lastName           = strrpos($name, ' ') ? substr($name, strrpos($name, ' ') + 1)  : '';

    //         $email              = $request->input('email', "$uid@$provider");

    //         $user               = User::firstOrNew(array('email' => $email));
    //         $user->password     = $user->password   ? : $email;
    //         $user->first_name   = $user->first_name ? : $firstName;
    //         $user->last_name    = $user->last_name  ? : $lastName;
    //         $user->country      = $user->country    ? : $request->input('country', '--');
    //         $user->address      = $user->address    ? : $request->input('address', null);
    //         $user->slug         = $user->slug       ? : $user->calcSlug();

    //         $user->save();

    //         $social->user_id    = $user->id;

    //     } else {
    //         $user               = User::find($social->user_id);
    //     }

    //     $social->access_token   = $request->input('social_token', null);
    //     $social->save();

    //     $token                  = JWTAuth::fromUser($user);

    //     return Response::json(compact('token'));
    // }

    public function me(Request $request)
    {
        $user   = JWTAuth::parseToken()->toUser();

        if (!$user) {
            return $this->responseWithErrors("User not authenticated!", 404);
        }

        return $this->respondWithItem($user, new UserTransformer);
    }

    public function getAllUsers()
    {
        $me     = JWTAuth::parseToken()->toUser();

        if (!$me || !$me->admin) {
            return $this->responseWithErrors("Not a valid user!", 404);
        }

        $users  = User::orderBy('id', 'ASC')->get()->all();

        return $this->respondWithCollection($users, new UserTransformer);
    }

    /**
     * Store a newly created resource in storage.
     *
     * @return Response
     */
    public function store(Request $request)
    {
        $me     = JWTAuth::parseToken()->toUser();

        if (!$me || !$me->admin) {
            return $this->responseWithErrors("Not a valid user!", 404);
        }

        $userData   = Input::get('user', array());

        $validator  = Validator::make($userData, [
            'email'         => 'required|email|max:255',
            'admin'         => 'required',
            // 'password'      => 'required|min:6',
            // 'slug'          => 'unique:users',
        ]);

        if ($validator->fails()) {
            return $this->responseWithErrors($validator->errors()->all(), 422);
        }

        Log::info("UserController :: Storing User!");

        $user               = !empty($userData['id']) ? User::firstOrNew(array('id' => $userData['id'])) : new User;

        $user->email        = $userData['email'];
        $user->admin        = $userData['admin'];
        $user->slug         = $user->calcSlug();
        if (!empty($userData['password'])) {
            $user->password = $userData['password'];
        }

        $user->save();

        return $this->respondWithItem($user, new UserTransformer);
    }

    /**
     * Remove the specified resource from storage.
     *
     * @param int $slug
     *
     * @return Response
     */
    public function delete($id)
    {
        $me     = JWTAuth::parseToken()->toUser();

        if (!$me || !$me->admin) {
            return $this->responseWithErrors("Not a valid user!", 404);
        }

        $user          = User::find($id);

        if (!$user) {
            return $this->responseWithErrors("User [$id] not found!", 500);
        }

        $user->delete();

        return $this->responseWithNoContent();
    }
}
