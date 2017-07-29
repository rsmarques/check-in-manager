<?php

namespace App\Helpers;

class GeneralHelper
{
    // Math Functions
    public static function arrayAverage($arr)
    {
        return count($arr) > 0 ? array_sum($arr) / count($arr) : 0;
    }
    public static function arrayMedian($arr)
    {
        if (count($arr) == 0) {
            return 0;
        }

        rsort($arr);
        $middle = round(count($arr) / 2);
        return $arr[$middle - 1];
    }

    // CSV Utils Functions
    public static function isAssociativeArray($arr)
    {
        return array_keys($arr) !== range(0, count($arr) - 1);
    }

    public static function arrayToCSV($data, $delimiter = ',', $enclosure = '"')
    {
        # Generate CSV data from array
        $fh = fopen('php://temp', 'rw'); # don't create a file, attempt
                                         # to use memory instead

        if (!empty($data)) {

            if (count($data) == 1 && !self::isAssociativeArray(current($data))) {
                # CSV only has one column
                fputcsv($fh, array_keys($data));
                foreach (current($data) as $row) {
                    fputcsv($fh, array($row), $delimiter, $enclosure);
                }

            } else {
                # write out the headers
                fputcsv($fh, array_keys(current($data)));
                # write out the data
                foreach ($data as $row) {
                    fputcsv($fh, $row, $delimiter, $enclosure);
                }
            }

        }

        rewind($fh);
        $csv = stream_get_contents($fh);
        fclose($fh);

        return $csv;
    }

    public static function CSVToArray($filename)
    {
        $csv = array_map('str_getcsv', file($filename));
        array_walk($csv, function (&$a) use ($csv) {
          $a = array_combine($csv[0], $a);
        });
        array_shift($csv); # remove column header

        return $csv;
    }
}
