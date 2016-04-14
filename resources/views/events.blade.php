@extends('layout')

@section('content')
	<ul>
		@foreach($events as $event)
			<li>Event: <a href="/event/{{$event->slug}}">{{ $event->name }}</a>, Guests: {{$event->guests()->count()}}</li>
		@endforeach
	</ul>
@stop