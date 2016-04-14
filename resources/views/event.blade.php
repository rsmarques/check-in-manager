@extends('layout')

@section('content')
    <ul>
        <li>Event: <a href="/event/{{$event->slug}}">{{ $event->name }}</a>, Guests: {{$guest_count}}</li>
    </ul>
    @if ($guest_count > 0)
        <div class="panel panel-default">
            <!-- Default panel contents -->
            <div class="panel-heading">Event Guests</div>

                <table class="table">
                    <thead>
                        <tr>
                            <th>#</th>
                            <th>Name</th>
                            <th>Email</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        @foreach($guests as $guest)
                            <tr>
                                <th>{{ $guest->slug }}</th>
                                <td>{{ $guest->name }}</td>
                                <td>{{ $guest->email }}</td>
                                <td>
                                    @if ($guest->check_in == 1)
                                        <button type="button" class="btn btn-danger">Check Out</button>
                                    @else
                                        <button type="button" class="btn btn-success">Check In</button>
                                    @endif
                                </td>
                            </tr>
                        @endforeach
                    </tbody>
                </table>
        </div>
    @endif
@stop