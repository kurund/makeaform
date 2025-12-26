<?php
namespace Civi\Api4;

use Civi\Api4\Generic\BasicGetFieldsAction;

/**
 * Makeaform API - provides data for the simplified form builder.
 *
 * @searchable none
 * @package Civi\Api4
 */
class Makeaform extends Generic\AbstractEntity {

  /**
   * Load entity list for the form builder.
   *
   * @param bool $checkPermissions
   * @return Action\Makeaform\GetEntities
   */
  public static function getEntities($checkPermissions = TRUE) {
    return (new Action\Makeaform\GetEntities(__CLASS__, __FUNCTION__))
      ->setCheckPermissions($checkPermissions);
  }

  /**
   * @param bool $checkPermissions
   * @return Generic\BasicGetFieldsAction
   */
  public static function getFields($checkPermissions = TRUE) {
    return (new BasicGetFieldsAction(__CLASS__, __FUNCTION__, function() {
      return [];
    }))->setCheckPermissions($checkPermissions);
  }

  /**
   * @return array
   */
  public static function permissions() {
    return [
      'default' => ['access CiviCRM'],
      'getEntities' => ['access CiviCRM'],
    ];
  }

}
