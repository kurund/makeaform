<?php

require_once 'makeaform.civix.php';

use CRM_Makeaform_ExtensionUtil as E;

/**
 * Implements hook_civicrm_config().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_config/
 */
function makeaform_civicrm_config(&$config): void {
  _makeaform_civix_civicrm_config($config);
}

/**
 * Implements hook_civicrm_install().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_install
 */
function makeaform_civicrm_install(): void {
  _makeaform_civix_civicrm_install();
}

/**
 * Implements hook_civicrm_enable().
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_enable
 */
function makeaform_civicrm_enable(): void {
  _makeaform_civix_civicrm_enable();
}

/**
 * Implements hook_civicrm_entityTypes().
 *
 * Declare entity types provided by this module.
 *
 * @link https://docs.civicrm.org/dev/en/latest/hooks/hook_civicrm_entityTypes
 */
function makeaform_civicrm_entityTypes(&$entityTypes): void {
  // Register custom Afform actions
  if (isset($entityTypes['Afform'])) {
    $entityTypes['Afform']['paths']['loadAdminData'] = [
      'Civi\Api4\Action\Afform\LoadAdminData',
    ];
  }
}
