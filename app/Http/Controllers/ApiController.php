<?php

namespace App\Http\Controllers;

use League\Fractal\Resource\Collection;
use League\Fractal\Resource\Item;
use League\Fractal\Manager;
use League\Fractal\Pagination\IlluminatePaginatorAdapter;
use Illuminate\Http\Response;

class ApiController extends Controller
{
    protected $statusCode = 200;

    public function __construct(Manager $fractal)
    {
        $this->fractal = $fractal;

        // Are we going to try and include embedded data?
        // $this->fractal->setRequestedScopes(explode(',', Input::get('include')));

        if (isset($_GET['include']) || isset($_POST['include'])) {
            $include = array_key_exists('include', $_GET) && $_GET['include'] ? $_GET['include'] : $_POST['include'];

            $this->fractal->parseIncludes($include);
        }
    }

    /**
     * Getter for statusCode.
     *
     * @return mixed
     */
    public function getStatusCode()
    {
        return $this->statusCode;
    }

    /**
     * Setter for statusCode.
     *
     * @param int $statusCode Value to set
     *
     * @return self
     */
    public function setStatusCode($statusCode)
    {
        $this->statusCode = $statusCode;

        return $this;
    }

    protected function respondWithItem($item, $callback)
    {
        $resource = new Item($item, $callback);

        $rootScope = $this->fractal->createData($resource);

        return $this->respondWithArray($rootScope->toArray());
    }

    protected function respondWithCollection($collection, $callback)
    {
        $resource = new Collection($collection, $callback);

        $rootScope = $this->fractal->createData($resource);

        return $this->respondWithArray($rootScope->toArray());
    }

    protected function respondWithCollectionPaginated($collection, $callback, $paginator)
    {
        $resource = new Collection($collection, $callback);

        $resource->setPaginator(new IlluminatePaginatorAdapter($paginator));

        $rootScope = $this->fractal->createData($resource);
        $result = $rootScope->toArray();
        $result['pagination'] = $result['meta']['pagination'];
        unset($result['meta']);

        return $this->respondWithArray($result);
    }

    protected function respondWithCollectionManuallyPaginated($collection, $callback, $perPage, $totalMembers)
    {
        // collection has to be converted to array
        if (gettype($collection) !== 'array') {
            $collection = $collection->all();
        }

        $paginator = Paginator::make($collection, $totalMembers, $perPage);
        $returnItems = $paginator->getCollection();

        return $this->respondWithCollectionPaginated($returnItems, $callback, $paginator);
    }

    protected function respondWithArray(array $array, array $headers = [])
    {
        return response($array, $this->statusCode)->header('Content-Type', $headers);
    }

    protected function responseWithErrors($errors, $code)
    {
        $errors = (array) $errors;

        return response(compact('errors'), $code);
    }

    protected function responseWithNoContent()
    {
        return response('', 204);
    }
}
